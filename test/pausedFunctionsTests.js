const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Paused functions tests', function() {
  let dex;
  let base;
  let secondary;
  let stopper;
  let testHelper;
  let wadify;
  let pricefy;
  let DEFAULT_BALANCE;
  let pair;
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, DEFAULT_BALANCE } = testHelper);
    [dex, base, secondary, stopper] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getStopper()
    ]);
    pair = [base.address, secondary.address];
  });

  const testPaused = function({ action, fulfillPreconditions, functionName, getParams }) {
    return contract(
      `RULE: only when the contract is not paused it is valid to ${action}`,
      async function([owner, account]) {
        // eslint-disable-next-line mocha/no-sibling-hooks
        before(function() {
          const accounts = [owner, account];
          const userData = accounts.map(() => ({
            baseBalance: DEFAULT_BALANCE,
            baseAllowance: DEFAULT_BALANCE,
            secondaryBalance: DEFAULT_BALANCE,
            secondaryAllowance: DEFAULT_BALANCE
          }));
          return testHelper.setBalancesAndAllowances({ dex, base, secondary, userData, accounts });
        });
        describe(`GIVEN that the preconditions to ${action} are fulfilled`, function() {
          if (fulfillPreconditions) before(fulfillPreconditions);

          describe('WHEN that the contract is paused', function() {
            before(function() {
              return stopper.pause(dex.address, { from: owner });
            });

            it(`THEN the call to ${functionName} reverts because of the pausing`, function() {
              return expectRevert(dex[functionName](...getParams(), { from: account }), 'paused');
            });
          });
        });
      }
    );
  };
  describe('', function() {
    testPaused({
      action: 'continue the execution of an already started tick',
      functionName: 'matchOrders',
      fulfillPreconditions: async () => {
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, false);
        await dex.insertBuyLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertBuyLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, true);
        await dex.matchOrders(...pair, 1);
      },
      getParams() {
        return [base.address, secondary.address, 1];
      }
    });
  });
  describe('Execute tick', function() {
    testPaused({
      action: 'execute a tick',
      functionName: 'matchOrders',
      fulfillPreconditions: async () => {
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, false);
        await dex.insertBuyLimitOrder(...pair, wadify(10), pricefy(1), 5);
        await dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, true);
      },
      getParams() {
        return [base.address, secondary.address, testHelper.DEFAULT_STEPS_FOR_MATCHING];
      }
    });

    // limit order
  });
  describe('Insert a sell limit order', function() {
    testPaused({
      action: 'insert a sell limit order',
      functionName: 'insertSellLimitOrder',
      getParams: () => [...pair, wadify(10), pricefy(1), 5]
    });
  });
  describe('Insert a buy limit order', function() {
    testPaused({
      action: 'insert a buy limit order',
      functionName: 'insertBuyLimitOrder',
      getParams: () => [...pair, wadify(10), pricefy(1), 5]
    });
  });
  describe('Insert a sell limit order with hint', function() {
    testPaused({
      action: 'insert a sell limit order with hint',
      functionName: 'insertSellLimitOrderAfter',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, 1]
    });
  });
  describe('Insert a buy limit order with hint', function() {
    testPaused({
      action: 'insert a buy limit order with hint',
      functionName: 'insertBuyLimitOrderAfter',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, 1]
    });
  });
  describe('cancel a buy limit order', function() {
    testPaused({
      action: 'cancel a buy limit order',
      functionName: 'cancelBuyOrder',
      getParams: () => [...pair, 0, 0],
      fulfillPreconditions: () => dex.insertBuyLimitOrder(...pair, wadify(10), pricefy(1), 5)
    });
  });
  describe('Cancel a sell limit order', function() {
    testPaused({
      action: 'cancel a sell limit order',
      functionName: 'cancelSellOrder',
      getParams: () => [...pair, 0, 0],
      fulfillPreconditions: () => dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), 5)
    });

    // market order
  });
  describe('Insert a sell market order', function() {
    testPaused({
      action: 'insert a sell market order',
      functionName: 'insertMarketOrder',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, false]
    });
  });
  describe('Insert a buy market order', function() {
    testPaused({
      action: 'insert a buy market order',
      functionName: 'insertMarketOrder',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, true]
    });
  });
  describe('Insert a sell market order with hint', function() {
    testPaused({
      action: 'insert a sell market order with hint',
      functionName: 'insertMarketOrderAfter',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, 1, false]
    });
  });

  describe('Insert a buy market order with hint', function() {
    testPaused({
      action: 'insert a buy market order with hint',
      functionName: 'insertMarketOrderAfter',
      getParams: () => [...pair, wadify(10), pricefy(1), 5, 1, true]
    });
  });
  describe('Cancel a buy market order', function() {
    testPaused({
      action: 'cancel a buy market order',
      functionName: 'cancelBuyOrder',
      getParams: () => [...pair, 1, 0],
      fulfillPreconditions: () => dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, true)
    });
  });
  describe('Cancel a sell market order', function() {
    testPaused({
      action: 'cancel a sell market order',
      functionName: 'cancelSellOrder',
      getParams: () => [...pair, 1, 0],
      fulfillPreconditions: () => dex.insertMarketOrder(...pair, wadify(10), pricefy(1), 5, false)
    });
  });
  // TODO add a new test that tests a tick that has been partially executed before pausing
  // TODO add an execute order expiration buy/order
});
