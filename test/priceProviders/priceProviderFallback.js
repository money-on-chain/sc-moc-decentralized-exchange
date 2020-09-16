const testHelperBuilder = require('../testHelpers/testHelper');

const DEFAULT_INITIAL_PRICE = 10;
let testHelper;
let wadify;
let pricefy;
let externalProvider;
let assertMarketPrice;

const decorateDex = function(dex, governor) {
  return Object.assign({}, dex, {
    createNewPair: createNewPair(dex, governor)
  });
};

const createNewPair = (dex, governor) =>
  async function(pair, priceProvider, lastClosingPrice, price, user) {
    await dex.addTokenPair(
      ...pair,
      priceProvider.address,
      pricefy(1),
      pricefy(lastClosingPrice),
      governor
    );
    if (price && user) {
      const insertArgs = [...pair, wadify(1), pricefy(price), 5, { from: user }];
      await Promise.all([
        dex.insertBuyLimitOrder(...insertArgs),
        dex.insertSellLimitOrder(...insertArgs)
      ]);
    }
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

  const setContracts = async function(accounts) {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, assertMarketPrice } = testHelper);
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
    dex = decorateDex(dex, governor);

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
          .getPriceProviderFallback()
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
      let user;
      let emergentPrice;
      describe('GIVEN the user has balance and allowance on all the tokens', function() {
        before(async function() {
          await setContracts(accounts);
          user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
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
            .getPriceProviderFallback()
            .new(externalProvider.address, dex.address, ...pair);
          await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);

          await dex.insertBuyLimitOrder(...pair, wadify(1), pricefy(1), 5, { from: user });
          await dex.insertSellLimitOrder(...pair, wadify(1), pricefy(3), 5, { from: user });
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
          .getPriceProviderFallback()
          .new(externalProvider.address, dex.address, ...pair);
        await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN inserting a new pair with different initial price', async function() {
        otherPriceProvider = await testHelper
          .getPriceProviderFallback()
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
      let user;
      describe('GIVEN the user has balance and allowance on all the tokens', function() {
        before(async function() {
          await setContracts(accounts);
          user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
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
              testHelper.getPriceProviderFallback().new(externalProvider.address, dex.address, ...p)
            )
          );

          await Promise.all([
            dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE),
            dex.createNewPair(otherPair, otherPriceProvider, DEFAULT_INITIAL_PRICE, 5, user)
          ]);
          await dex.matchOrders(...otherPair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        });
        describe('AND there are orders in two different token pairs', function() {
          describe('WHEN running the matching process', function() {
            it('THEN the market price for the pair should be the expected ', function() {
              return assertMarketPrice(otherPriceProvider, 5);
            });
            it('AND the market price for the other pair should be the same', function() {
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
              it('THEN the market price for the pair should be the same as before', function() {
                return assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
              });
            });
          });
        });
      });
    });
  });
});
