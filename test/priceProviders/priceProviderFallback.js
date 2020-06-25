const testHelperBuilder = require('../testHelpers/testHelper');

const DEFAULT_INITIAL_PRICE = 10;
let testHelper;
let wadify;
let pricefy;
let externalProvider;

const decorateDex = function(dex, governor) {
  return Object.assign({}, dex, {
    createNewPair: createNewPair(dex, governor)
  });
};

const createNewPair = (dex, governor) =>
  async function(baseToken, secondaryToken, priceProvider, lastClosingPrice, price, user) {
    await dex.addTokenPair(
      baseToken.address,
      secondaryToken.address,
      priceProvider.address,
      pricefy(1),
      pricefy(lastClosingPrice),
      governor
    );
    if (price && user) {
      await Promise.all([
        dex.insertBuyLimitOrder(
          baseToken.address,
          secondaryToken.address,
          wadify(1),
          pricefy(price),
          5,
          {
            from: user
          }
        ),
        dex.insertSellLimitOrder(
          baseToken.address,
          secondaryToken.address,
          wadify(1),
          pricefy(price),
          5,
          {
            from: user
          }
        )
      ]);
    }
  };

const assertMarketPrice = async (priceProvider, expectedClosingPrice) => {
  const lastClosingPrice = await priceProvider.peek();
  assert(lastClosingPrice[1], 'Does not have price');
  return testHelper.assertBigPrice(
    parseInt(lastClosingPrice[0], 16).toString(),
    expectedClosingPrice,
    'Last closing price'
  );
};

describe('Price provider with fallback tests - defaults to last closing price when external does not have a price', function() {
  let doc;
  let dex;
  let secondary;
  let otherSecondary;
  let governor;

  const setContracts = async function(accounts) {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy } = testHelper);
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
          .new(externalProvider.address, dex.address, doc.address, secondary.address);
        await dex.createNewPair(doc, secondary, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN running the matching process', async function() {
        await dex.matchOrders(
          doc.address,
          secondary.address,
          testHelper.DEFAULT_STEPS_FOR_MATCHING
        );
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
          await Promise.all([
            testHelper.setBalancesAndAllowances({
              dex,
              base: doc,
              secondary,
              userData: null,
              accounts
            }),
            testHelper.setBalancesAndAllowances({
              dex,
              base: doc,
              secondary: otherSecondary,
              userData: null,
              accounts
            })
          ]);

          priceProvider = await testHelper
            .getPriceProviderFallback()
            .new(externalProvider.address, dex.address, doc.address, secondary.address);
          await dex.createNewPair(doc, secondary, priceProvider, DEFAULT_INITIAL_PRICE);

          await dex.insertBuyLimitOrder(doc.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          });
          await dex.insertSellLimitOrder(doc.address, secondary.address, wadify(1), pricefy(3), 5, {
            from: user
          });
          ({ emergentPrice } = await dex.getTokenPairStatus.call(doc.address, secondary.address));
          await dex.matchOrders(
            doc.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
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
          .new(externalProvider.address, dex.address, doc.address, secondary.address);
        await dex.createNewPair(doc, secondary, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN inserting a new pair with different initial price', async function() {
        otherPriceProvider = await testHelper
          .getPriceProviderFallback()
          .new(externalProvider.address, dex.address, doc.address, otherSecondary.address);
        await dex.createNewPair(doc, otherSecondary, priceProvider, DEFAULT_INITIAL_PRICE * 2);
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
          await Promise.all([
            testHelper.setBalancesAndAllowances({
              dex,
              base: doc,
              secondary,
              userData: null,
              accounts
            }),
            testHelper.setBalancesAndAllowances({
              dex,
              base: doc,
              secondary: otherSecondary,
              userData: null,
              accounts
            })
          ]);

          priceProvider = await testHelper
            .getPriceProviderFallback()
            .new(externalProvider.address, dex.address, doc.address, secondary.address);
          otherPriceProvider = await testHelper
            .getPriceProviderFallback()
            .new(externalProvider.address, dex.address, doc.address, otherSecondary.address);
          await Promise.all([
            dex.createNewPair(doc, secondary, priceProvider, DEFAULT_INITIAL_PRICE),

            dex.createNewPair(
              doc,
              otherSecondary,
              otherPriceProvider,
              DEFAULT_INITIAL_PRICE,
              5,
              user
            )
          ]);
          await dex.matchOrders(
            doc.address,
            otherSecondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
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
