const testHelperBuilder = require('./testHelpers/testHelper');

const TokenPriceProviderLastClosingPrice = artifacts.require('TokenPriceProviderLastClosingPrice');

const DEFAULT_INITIAL_PRICE = 10;
let testHelper;
let wadify;
let pricefy;
let priceProvider;
let priceProviderOtherSecondary;

const decorateDex = function(dex, governor) {
  return Object.assign({}, dex, {
    createNewPair: createNewPair(dex, governor)
  });
};

const createNewPair = (dex, governor) =>
  async function(baseToken, secondaryToken, lastClosingPrice, price, user) {
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

const assertNotZeroLastClosingPrice = async function(priceProviderContract, expectedClosingPrice) {
  const { lastNonZeroClosingPrice } = await priceProviderContract.peekAsUint.call();
  return testHelper.assertBigPrice(
    lastNonZeroClosingPrice,
    expectedClosingPrice,
    'Last closing price'
  );
};

describe('Last closing price provider tests', function() {
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
    [dex, doc, secondary, otherSecondary, governor] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      OwnerBurnableToken.new(),
      testHelper.getGovernor()
    ]);
    priceProvider = await TokenPriceProviderLastClosingPrice.new(
      dex.address,
      doc.address,
      secondary.address
    );
    priceProviderOtherSecondary = await TokenPriceProviderLastClosingPrice.new(
      dex.address,
      doc.address,
      otherSecondary.address
    );
    dex = testHelper.decorateGovernedSetters(dex);
    dex = decorateDex(dex, governor);
  };

  describe('RULE: Last closing price from PriceProvider can not be 0', function() {
    contract('CASE: Running the matching process without orders', function(accounts) {
      before(function() {
        return setContracts(accounts);
      });
      it('GIVEN there is a token pair without orders', async function() {
        await dex.createNewPair(doc, secondary, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN running the matching process', async function() {
        await dex.matchOrders(
          doc.address,
          secondary.address,
          testHelper.DEFAULT_STEPS_FOR_MATCHING
        );
      });
      it('THEN the last closing price from price provider must be the default price', async function() {
        await assertNotZeroLastClosingPrice(priceProvider, DEFAULT_INITIAL_PRICE);
      });
    });

    contract('CASE: Running the matching process with 2 orders', function(accounts) {
      const orderPrice = 7.5;
      let user;
      before(async function() {
        await setContracts(accounts);
        user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
        await testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary,
          userData: null,
          accounts
        });
      });
      it('GIVEN there is a new token pair without orders', async function() {
        await dex.createNewPair(doc, secondary, DEFAULT_INITIAL_PRICE);
      });
      it('AND there is a buy LO and a sell LO', async function() {
        await dex.insertBuyLimitOrder(
          doc.address,
          secondary.address,
          wadify(1),
          pricefy(orderPrice),
          1,
          {
            from: user
          }
        );
        await dex.insertSellLimitOrder(
          doc.address,
          secondary.address,
          wadify(1),
          pricefy(orderPrice),
          1,
          {
            from: user
          }
        );
      });
      it('THEN the last closing price from price provider should be the default price', async function() {
        await assertNotZeroLastClosingPrice(priceProvider, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN running the matching orders process', async function() {
        await dex.matchOrders(
          doc.address,
          secondary.address,
          testHelper.DEFAULT_STEPS_FOR_MATCHING
        );
      });
      it('THEN the last closing price from price provider must 7.5', async function() {
        await assertNotZeroLastClosingPrice(priceProvider, orderPrice);
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
          await dex.createNewPair(doc, secondary, DEFAULT_INITIAL_PRICE);
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
              return testHelper.assertBig(emergentPrice, 0, 'Emergent price');
            });
            it('THEN the last not zero closing of the PriceProvider should be default value', async function() {
              await assertNotZeroLastClosingPrice(priceProvider, DEFAULT_INITIAL_PRICE);
            });
          });
        });
      });
    });
  });

  describe('RULE: Last closing price is token-pair independent', function() {
    contract('CASE: Adding a new pair of tokens', function(accounts) {
      before(function() {
        return setContracts(accounts);
      });

      it('GIVEN there is a token pair ', async function() {
        await dex.createNewPair(doc, secondary, DEFAULT_INITIAL_PRICE);
      });
      it('WHEN inserting a new pair with different initial price', async function() {
        await dex.createNewPair(doc, otherSecondary, DEFAULT_INITIAL_PRICE * 2);
      });
      it('THEN each PriceProvider return respective default last closing prices', async function() {
        await Promise.all([
          assertNotZeroLastClosingPrice(priceProvider, DEFAULT_INITIAL_PRICE),
          assertNotZeroLastClosingPrice(priceProviderOtherSecondary, DEFAULT_INITIAL_PRICE * 2)
        ]);
      });
    });
  });
});
