const testHelperBuilder = require('./testHelpers/testHelper');

describe('Token pair EMA Price tests', function() {
  let dex;
  let base;
  let secondary;
  let testHelper;
  let wadify;
  let pricefy;
  let DEFAULT_BALANCE;
  let decorateGovernedSetters;
  const MARKET_PRICE = 2;

  const getLimitInsertionParams = price => [
    base.address,
    secondary.address,
    wadify(10),
    pricefy(price),
    5
  ];
  // Assuming market price of MARKET_PRICE
  const getMarketInsertionParams = (price, isBuy) => [
    base.address,
    secondary.address,
    wadify(10),
    pricefy(price / MARKET_PRICE),
    5,
    isBuy
  ];
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, DEFAULT_BALANCE, decorateGovernedSetters } = testHelper);
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getGovernor()
    ]);

    dex = decorateGovernedSetters(dex);
  });
  const initContractsAndOrders = function(accounts, price) {
    return async function() {
      const userData = accounts.map(() => ({
        baseBalance: DEFAULT_BALANCE,
        baseAllowance: DEFAULT_BALANCE,
        secondaryBalance: DEFAULT_BALANCE,
        secondaryAllowance: DEFAULT_BALANCE
      }));
      await testHelper.setBalancesAndAllowances({
        dex,
        base,
        secondary,
        userData,
        accounts
      });
      await Promise.all([
        dex.insertSellLimitOrder(...getLimitInsertionParams(price)),
        dex.insertSellLimitOrder(...getLimitInsertionParams(price)),
        dex.insertMarketOrder(...getMarketInsertionParams(price, false)),
        dex.insertBuyLimitOrder(...getLimitInsertionParams(price)),
        dex.insertBuyLimitOrder(...getLimitInsertionParams(price)),
        dex.insertMarketOrder(...getMarketInsertionParams(price, true))
      ]);
    };
  };

  describe('RULE: When the pair has not runned any tick', function() {
    it('THEN the EmaPrice should be the same as the initial price', async function() {
      const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
      return testHelper.assertBig(
        tokenPairStatus.emaPrice,
        tokenPairStatus.lastClosingPrice,
        'EmaPrice'
      );
    });
  });

  describe('RULE: When the pair has runned one tick and some orders matched', function() {
    contract(
      'GIVEN that there are three buy orders and three sell orders where there is matching price is 1',
      function(accounts) {
        before(async function() {
          await initContractsAndOrders(accounts, 1)();
          await dex.matchOrders(base.address, secondary.address, 10000);
        });

        it('THEN the emaPrice should stay the same', async function() {
          const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
          return testHelper.assertBigWad(tokenPairStatus.emaPrice, 1, 'EmaPrice');
        });
      }
    );
    contract(
      'GIVEN that there are three buy orders and three sell orders where there is matching price is not 1',
      function(accounts) {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(async function() {
          await initContractsAndOrders(accounts, 2)();
          await dex.matchOrders(base.address, secondary.address, 10000);
        });

        it('THEN the emaPrice should change and be different than the previous one (it was 1)', async function() {
          const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
          return testHelper.assertBigWad(tokenPairStatus.emaPrice, 1.01653, 'EmaPrice');
        });
      }
    );
  });
});
