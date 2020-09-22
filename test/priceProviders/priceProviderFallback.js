const testHelperBuilder = require('../testHelpers/testHelper');

const DEFAULT_INITIAL_PRICE = 10;
let testHelper;
let pricefy;
let externalProvider;
let assertMarketPrice;

const decorateCreateNewPair = (dex, governor) =>
  Object.assign({}, dex, {
    createNewPair: createNewPair(dex, governor)
  });

const createNewPair = (dex, governor) =>
  async function(pair, priceProvider, lastClosingPrice) {
    await dex.addTokenPair(
      ...pair,
      priceProvider.address,
      pricefy(1),
      pricefy(lastClosingPrice),
      governor
    );
  };

describe('Price provider with fallback tests - defaults to last closing price when external does not have a price', function() {
  let doc;
  let dex;
  let secondary;
  let otherSecondary;
  let governor;
  // [base.address, secondary.address] handy setup to improve readability
  let pair;
  let otherPair;

  const setContracts = async accounts => {
    testHelper = testHelperBuilder();
    ({ pricefy, assertMarketPrice } = testHelper);
    const OwnerBurnableToken = testHelper.getOwnerBurnableToken();
    await testHelper.createContracts({
      owner: accounts[0],
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1
    });
    [dex, doc, secondary, otherSecondary, governor, externalProvider] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      OwnerBurnableToken.new(),
      testHelper.getGovernor(),
      testHelper.getTokenPriceProviderFake().new()
    ]);
    pair = [doc.address, secondary.address];
    otherPair = [doc.address, otherSecondary.address];

    dex = testHelper.decorateGovernedSetters(dex);
    dex = testHelper.decorateOrderInsertions(dex, accounts, { base: doc, secondary });
    dex = decorateCreateNewPair(dex, governor);

    await externalProvider.pokeValidity(false);
  };

  describe('RULE: Last closing price can not be 0', function() {
    let priceProvider;
    contract('CASE: Running the matching process without orders', function(accounts) {
      before(function() {
        return setContracts(accounts);
      });
      it('GIVEN there is a token pair without orders', async function() {
        priceProvider = await testHelper
          .getExternalOraclePriceProviderFallback()
          .new(externalProvider.address, dex.address, ...pair);
        await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN running the matching process', async function() {
        await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
      });
      it('THEN the market price for the pair should be the same', async function() {
        await assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
      });
    });

    contract('CASE: Running the matching process with emergentPrice 0', function(accounts) {
      let emergentPrice;
      describe('GIVEN the user has balance and allowance on all the tokens', function() {
        before(async function() {
          await setContracts(accounts);
          await Promise.all(
            [secondary, otherSecondary].map(sec =>
              testHelper.setBalancesAndAllowances({
                dex,
                base: doc,
                secondary: sec,
                accounts
              })
            )
          );

          priceProvider = await testHelper
            .getExternalOraclePriceProviderFallback()
            .new(externalProvider.address, dex.address, ...pair);
          await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);

          await dex.insertBuyLimitOrder({ price: 1 });
          await dex.insertSellLimitOrder({ price: 3 });
          ({ emergentPrice } = await dex.getTokenPairStatus.call(...pair));
          await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        });
        describe('AND there is a token pair with orders that do not match', function() {
          describe('WHEN running the matching process', function() {
            it('THEN emergentPrice is zero', function() {
              return testHelper.assertBig(emergentPrice, 0, 'Last closing price');
            });
            it('THEN the market price for the pair should be the same', async function() {
              await assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
            });
          });
        });
      });
    });
  });

  describe('RULE: Last closing price is token-pair independent', function() {
    let priceProvider;
    let otherPriceProvider;
    contract('CASE: Adding a new pair of tokens', function(accounts) {
      before(function() {
        return setContracts(accounts);
      });

      it('GIVEN there is a token pair ', async function() {
        priceProvider = await testHelper
          .getExternalOraclePriceProviderFallback()
          .new(externalProvider.address, dex.address, ...pair);
        await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN inserting a new pair with different initial price', async function() {
        otherPriceProvider = await testHelper
          .getExternalOraclePriceProviderFallback()
          .new(externalProvider.address, dex.address, ...otherPair);
        await dex.createNewPair(otherPair, priceProvider, DEFAULT_INITIAL_PRICE * 2);
      });
      it('THEN each pair has its respective last closing price', async function() {
        await Promise.all([
          await assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE),
          await assertMarketPrice(otherPriceProvider, DEFAULT_INITIAL_PRICE * 2)
        ]);
      });
    });

    contract('CASE: Running the matching process should update only the given token pair', function(
      accounts
    ) {
      describe('GIVEN the user has balance and allowance on all the tokens', function() {
        before(async function() {
          await setContracts(accounts);
          await Promise.all(
            [secondary, otherSecondary].map(sec =>
              testHelper.setBalancesAndAllowances({
                dex,
                base: doc,
                secondary: sec,
                accounts
              })
            )
          );

          [priceProvider, otherPriceProvider] = await Promise.all(
            [pair, otherPair].map(p =>
              testHelper
                .getExternalOraclePriceProviderFallback()
                .new(externalProvider.address, dex.address, ...p)
            )
          );

          await Promise.all([
            dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE),
            dex.createNewPair(otherPair, otherPriceProvider, DEFAULT_INITIAL_PRICE)
          ]);
          // Insert two matching orders so we can have a new last matching Price
          await Promise.all([
            dex.insertBuyLimitOrder({ base: doc, secondary: otherSecondary, price: 5 }),
            dex.insertSellLimitOrder({ base: doc, secondary: otherSecondary, price: 5 })
          ]);
          await dex.matchOrders(...otherPair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        });
        describe('AND there are orders in two different token pairs', function() {
          describe('WHEN running the matching process', function() {
            it('THEN the market price for the matched pair should be last price', function() {
              // One single buy/sell order with the same price (5), give same last match price
              return assertMarketPrice(otherPriceProvider, 5);
            });
            it('AND the market price for the non matching pair should be the same', function() {
              return assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
            });
          });
          describe('WHEN the external oracle has the price back', function() {
            const externalPrice = 33;
            before(async function() {
              await externalProvider.pokeValidity(true);
              return externalProvider.poke(pricefy(externalPrice));
            });
            it('THEN the market price for the pair should be taken from the external oracle', function() {
              return assertMarketPrice(otherPriceProvider, externalPrice);
            });
            describe('AND the external oracle has the price invalidated again', function() {
              before(async function() {
                await externalProvider.pokeValidity(false);
              });
              it('THEN the market price for the pair should be the same as before', async function() {
                await assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
                await assertMarketPrice(otherPriceProvider, 5);
              });
            });
          });
        });
      });
    });
  });
});
