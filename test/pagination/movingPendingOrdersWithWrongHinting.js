const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
describe('Depletion of the Pending Queue in the after match with wrong hints', function() {
  let dex;
  let base;
  let secondary;
  let baseAddress;
  let secondaryAddress;
  let pair;
  let DEFAULT_PRICE;
  let assertTickStage;

  const initContractsAndAllowance = (accounts, tickParams = {}) => async () => {
    testHelper = testHelperBuilder();
    ({ assertTickStage, DEFAULT_PRICE } = testHelper);
    await testHelper.createContracts({
      useFakeDex: true,
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1,
      tokenPair: {},
      owner: accounts[0],
      ...tickParams
    });

    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    [baseAddress, secondaryAddress] = [base.address, secondary.address];
    pair = [baseAddress, secondaryAddress];
    dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
    dex = testHelper.decorateGetOrderAtIndex(dex);

    assertTickStage = assertTickStage(dex, pair);

    const userData = {
      // buyer
      '1': {
        baseBalance: 1000,
        baseAllowance: 1000
      },
      // seller
      '2': {
        secondaryBalance: 1000,
        secondaryAllowance: 1000
      }
    };
    await testHelper.setBalancesAndAllowances({ userData, accounts });
  };
  const testTickStage = expectedStage => () =>
    function() {
      return assertTickStage(testHelper.tickStages[expectedStage]);
    };
  const testIsMatching = testTickStage('RUNNING_MATCHING');
  const givenTheTickIsRunning = function([, buyer, seller], scenario) {
    return describe('GIVEN the contract is running a tick leaving one open sell order', function() {
      before(async function() {
        // 4 orders so the matching has at least 2 steps to run
        await Promise.all([
          dex.insertBuyLimitOrder({ from: buyer }),
          dex.insertBuyLimitOrder({ from: buyer }),
          dex.insertSellLimitOrder({ from: seller }),
          dex.insertSellLimitOrder({ from: seller }),
          dex.insertSellLimitOrder({ from: seller }) // Order ID 5
        ]);

        // running the two steps of the simulation
        // and the two steps of the matching,
        // finally leaving the contract about to move the pending orders
        await dex.matchOrders(...pair, 4);
        await testIsMatching()();
      });

      scenario();
    });
  };

  contract('SCENARIO: 1 pending order with a hint pointing to a non existent id', function(
    accounts
  ) {
    const [, , seller] = accounts;
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there is a sell order pending', function() {
        before(function() {
          return dex.insertSellLimitOrder({ from: seller, pending: true });
        });
        describe('WHEN calling matchOrders with just the enough steps and a wrong hint(pointing to a non existent id)', function() {
          it('THEN the tx fails', function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * move the existing pending order and finish the pagination
             */
            return expectRevert(
              dex.matchOrdersWithHints(...pair, 1, [19]),
              'PreviousOrder doesnt exist'
            );
          });
        });
      });
    });
  });

  contract(
    'SCENARIO: 1 pending order with a hint pointing to the first place; same price',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there is a sell order pending with the same price as the open one', function() {
          before(function() {
            return dex.insertSellLimitOrder({ from: seller, pending: true });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it at the start', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [0]),
                'Price doesnt belong to start'
              );
            });
          });
        });
      });
    }
  );
  contract(
    'SCENARIO: 1 pending sell order with a hint pointing to the first place; higher price',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there is a sell order pending with a higher price', function() {
          before(function() {
            return dex.insertSellLimitOrder({
              from: seller,
              pending: true,
              price: DEFAULT_PRICE * 2
            });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to the new one at the start', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [0]),
                'Price doesnt belong to start'
              );
            });
          });
        });
      });
    }
  );

  contract(
    'SCENARIO: 2 pending sell orders with a hint pointing to a place between two orders; too low position',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are two a sell order pending with the same price as the open one ', function() {
          before(function() {
            return Promise.all([
              dex.insertSellLimitOrder({ from: seller, pending: true }), // Order ID 6
              dex.insertSellLimitOrder({ from: seller, pending: true }) // Order ID 7
            ]);
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it in between', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 2, [5, 5]),
                'Order should go after'
              );
            });
          });
        });
      });
    }
  );

  contract(
    'SCENARIO: 1 pending order with a hint pointing to the last place with lower price; too high position',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there is a sell order pending with a lower price', function() {
          before(function() {
            return dex.insertSellLimitOrder({
              from: seller,
              pending: true,
              price: DEFAULT_PRICE / 2
            });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it least', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [5]),
                'Order should go before'
              );
            });
          });
        });
      });
    }
  );
});
