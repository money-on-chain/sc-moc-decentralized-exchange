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

  const getCommonInsertionParams = () => [
    base.address,
    secondary.address,
    wadify(10),
    pricefy(1),
    5
  ];
  const getNotCommonInsertionParams = () => [
    base.address,
    secondary.address,
    wadify(10),
    pricefy(2),
    5
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
  const initContractsAndOrders = function(accounts, insertionParams) {
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
        dex.insertSellOrder(...insertionParams),
        dex.insertSellOrder(...insertionParams),
        dex.insertSellOrder(...insertionParams),
        dex.insertBuyOrder(...insertionParams),
        dex.insertBuyOrder(...insertionParams),
        dex.insertBuyOrder(...insertionParams)
      ]);
    };
  };

  describe('RULE: When the pair has not runned any tick', function() {
    it('THEN the EmaPrice should be the same as the initial price', async function() {
      const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
      testHelper.assertBig(tokenPairStatus.emaPrice, tokenPairStatus.lastClosingPrice, 'EmaPrice');
    });
  });

  describe('RULE: When the pair has runned one tick and some orders matched', function() {
    contract(
      'GIVEN that there are three buy orders and three sell orders where there is matching price is 1',
      function(accounts) {
        before(async function() {
          await initContractsAndOrders(accounts, getCommonInsertionParams())();
          await dex.matchOrders(base.address, secondary.address, 10000);
        });

        it('THEN the emaPrice should stay the same', async function() {
          const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
          testHelper.assertBigWad(tokenPairStatus.emaPrice, 1, 'EmaPrice');
        });
      }
    );
    contract(
      'GIVEN that there are three buy orders and three sell orders where there is matching price is not 1',
      function(accounts) {
        before(async function() {
          await initContractsAndOrders(accounts, getNotCommonInsertionParams())();
          await dex.matchOrders(base.address, secondary.address, 10000);
        });

        it('THEN the emaPrice should change and be different than the previous one (it was 1)', async function() {
          const tokenPairStatus = await dex.getTokenPairStatus(base.address, secondary.address);
          testHelper.assertBigWad(tokenPairStatus.emaPrice, 1.01653, 'EmaPrice');
        });
      }
    );
  });
});
