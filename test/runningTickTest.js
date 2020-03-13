const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Running tick functions tests', function() {
  let dex;
  let base;
  let secondary;
  let wrbtc;
  let governor;
  let testHelper;
  let wadify;
  let pricefy;
  let DEFAULT_BALANCE;
  let pair;
  let decorateGovernedSetters;
  const getCommonInsertionParams = () => [
    base.address,
    secondary.address,
    wadify(10),
    pricefy(1),
    5
  ];
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, DEFAULT_BALANCE, decorateGovernedSetters } = testHelper);
    [dex, base, secondary, wrbtc, governor] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getWRBTC(),
      testHelper.getGovernor()
    ]);

    dex = decorateGovernedSetters(dex);
  });
  const initContractsAndOrders = function(accounts) {
    return async function() {
      const userData = accounts.map(() => ({
        baseBalance: DEFAULT_BALANCE,
        baseAllowance: DEFAULT_BALANCE,
        secondaryBalance: DEFAULT_BALANCE,
        secondaryAllowance: DEFAULT_BALANCE
      }));
      await testHelper.setBalancesAndAllowances({ dex, base, secondary, userData, accounts });
      await Promise.all([
        dex.insertSellOrder(...getCommonInsertionParams()),
        dex.insertSellOrder(...getCommonInsertionParams()),
        dex.insertSellOrder(...getCommonInsertionParams()),
        dex.insertBuyOrder(...getCommonInsertionParams()),
        dex.insertBuyOrder(...getCommonInsertionParams()),
        dex.insertBuyOrder(...getCommonInsertionParams())
      ]);
      pair = [base.address, secondary.address];
    };
  };

  const testRunningTick = function({
    action,
    fulfillPreconditions,
    functionName,
    getParams,
    shouldCheckMovingPendingOrders
  }) {
    return function() {
      describe(`RULE: only when a pair is not running a tick it is valid to ${action}`, function() {
        contract('GIVEN that there are two buy orders and two sell orders', function(accounts) {
          before(initContractsAndOrders(accounts));
          describe(`AND that the specific preconditions to ${action} are fulfilled`, function() {
            if (fulfillPreconditions) before(fulfillPreconditions);

            describe('WHEN a tick is running in another pair', function() {
              before(function() {
                return dex.matchOrders(base.address, wrbtc.address, 1);
              });

              it(`THEN the call to ${functionName} does NOT revert`, function() {
                return dex[functionName](...getParams());
              });
            });
          });
        });
        contract('GIVEN that there are two buy orders and two sell orders', function(accounts) {
          before(initContractsAndOrders(accounts));
          describe(`AND that the specific preconditions to ${action} are fulfilled`, function() {
            if (fulfillPreconditions) before(fulfillPreconditions);

            describe('WHEN the simmulation is running in the pair', function() {
              before(async function() {
                await dex.matchOrders(base.address, secondary.address, 1);
              });

              it(`THEN the call to ${functionName} reverts because of the running tick`, async function() {
                await testHelper.assertBig(
                  // Checking we are in the desired state, for test security reasons
                  dex.getTickStage(...pair),
                  testHelper.tickStages.RUNNING_SIMULATION
                );

                return expectRevert(dex[functionName](...getParams()), 'Tick is running');
              });

              describe('WHEN the tick advances to running matching in that pair', function() {
                before(function() {
                  return dex.matchOrders(base.address, secondary.address, 3);
                });

                it(`THEN the call to ${functionName} reverts because of the running tick`, async function() {
                  await testHelper.assertBig(
                    // Checking we are in the desired state, for test security reasons
                    dex.getTickStage(...pair),
                    testHelper.tickStages.RUNNING_MATCHING
                  );
                  return expectRevert(dex[functionName](...getParams()), 'Tick is running');
                });

                if (shouldCheckMovingPendingOrders) {
                  describe('WHEN the tick advances to inserting pending orders in that pair', function() {
                    before(async function() {
                      await dex.insertSellOrder(...getCommonInsertionParams());
                      await dex.insertSellOrder(...getCommonInsertionParams());
                      // Finish matching and start moving of pending orders
                      await dex.matchOrders(base.address, secondary.address, 3);
                    });
                    it(`THEN the call to ${functionName} reverts because of the running tick`, async function() {
                      await testHelper.assertBig(
                        // Checking we are in the desired state, for test security reasons
                        dex.getTickStage(...pair),
                        testHelper.tickStages.MOVING_PENDING_ORDERS
                      );
                      return expectRevert(dex[functionName](...getParams()), 'Tick is running');
                    });
                  });
                }
              });
            });
          });
        });
      });
    };
  };

  describe(
    'Cancel a buy order',
    testRunningTick({
      action: 'cancel a buy order',
      functionName: 'cancelBuyOrder',
      shouldCheckMovingPendingOrders: true,
      getParams() {
        return [base.address, secondary.address, 4, 3];
      }
    })
  );

  describe(
    'Cancel a sell order',
    testRunningTick({
      action: 'cancel a sell order',
      functionName: 'cancelSellOrder',
      shouldCheckMovingPendingOrders: true,
      getParams() {
        return [base.address, secondary.address, 2, 1];
      }
    })
  );

  describe(
    'Disable a token pair',
    testRunningTick({
      action: 'disable the token pair',
      functionName: 'disableTokenPair',
      shouldCheckMovingPendingOrders: true,
      getParams() {
        return [base.address, secondary.address, governor];
      }
    })
  );

  describe(
    'Enable a token pair',
    testRunningTick({
      action: 'enable a token pair',
      functionName: 'enableTokenPair',
      shouldCheckMovingPendingOrders: false,
      fulfillPreconditions() {
        return dex.disableTokenPair(base.address, secondary.address, governor);
      },
      getParams() {
        return [base.address, secondary.address, governor];
      }
    })
  );
});
