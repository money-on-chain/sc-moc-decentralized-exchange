const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
const ERROR_HINT_NOT_LIMIT_ORDER = 'Hint is not limit order';
describe('Depletion of the Pending Queue MO in the after match with wrong hints', function() {
  let dex;
  let base;
  let secondary;
  let baseAddress;
  let secondaryAddress;
  let pair;
  let assertTickStage;
  const DEFAULT_MULTIPLY_FACTOR = 1.6;
  const ERROR_MULTIPLY_DOES_NOT_BELONG_START = 'Multiply factor doesnt belong to start';
  const ERROR_ORDER_SHOULD_GO_AFTER = 'Order should go after';
  const ERROR_MULTIPLY_FACTOR_SHOULD_GO_BEFORE = 'Market Order should go before';

  const initContractsAndAllowance = (accounts, tickParams = {}) => async () => {
    testHelper = testHelperBuilder();
    ({ assertTickStage } = testHelper);
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
          dex.insertBuyMarketOrder({ from: buyer }),
          dex.insertBuyMarketOrder({ from: buyer }),
          dex.insertSellMarketOrder({ from: seller }),
          dex.insertSellMarketOrder({ from: seller }),
          dex.insertSellMarketOrder({ from: seller }) // Order ID 5
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
          return dex.insertSellMarketOrder({ from: seller, pending: true });
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
            return dex.insertSellMarketOrder({ from: seller, pending: true });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it at the start', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [0]),
                ERROR_MULTIPLY_DOES_NOT_BELONG_START
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
            return dex.insertSellMarketOrder({
              from: seller,
              pending: true,
              priceMultiplier: DEFAULT_MULTIPLY_FACTOR * 2
            });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to the new one at the start', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [0]),
                ERROR_MULTIPLY_DOES_NOT_BELONG_START
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
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order ID 6
              dex.insertSellMarketOrder({ from: seller, pending: true }) // Order ID 7
            ]);
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it in between', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 2, [5, 5]),
                ERROR_ORDER_SHOULD_GO_AFTER
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
            return dex.insertSellMarketOrder({
              from: seller,
              pending: true,
              priceMultiplier: DEFAULT_MULTIPLY_FACTOR / 2
            });
          });
          describe('WHEN calling matchOrders with just the enough steps and the hint to put it least', function() {
            it('THEN the tx fails', function() {
              return expectRevert(
                dex.matchOrdersWithHints(...pair, 1, [5]),
                ERROR_MULTIPLY_FACTOR_SHOULD_GO_BEFORE
              );
            });
          });
        });
      });
    }
  );

  contract('SCENARIO: crossed references LO and MO', function(accounts) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there one pending LO with a hint pointing to one MO', function() {
        before(async function() {
          await dex.insertSellMarketOrder({
            from: seller,
            pending: true,
            priceMultiplier: DEFAULT_MULTIPLY_FACTOR / 2
          });
          await dex.insertSellLimitOrder({
            from: seller,
            pending: true
          });
        });
        describe('WHEN calling matchOrders with different orders types', function() {
          it('THEN the tx fails', function() {
            return expectRevert(
              dex.matchOrdersWithHints(...pair, 5, [6]),
              ERROR_HINT_NOT_LIMIT_ORDER
            );
          });
        });
      });
    });
  });

  contract('SCENARIO: crossed references MO and LO', function(accounts) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there one pending MO with a hint pointing to one LO', function() {
        before(async function() {
          await dex.insertSellMarketOrder({
            from: seller,
            pending: true,
            priceMultiplier: DEFAULT_MULTIPLY_FACTOR
          });

          await dex.insertSellLimitOrder({
            from: seller,
            pending: true
          });
        });
        describe('WHEN calling matchOrders with between LO and MO', function() {
          it('THEN the tx fails', function() {
            return expectRevert(
              dex.matchOrdersWithHints(...pair, 6, [5]),
              ERROR_HINT_NOT_LIMIT_ORDER
            );
          });
        });
      });
    });
  });
});
