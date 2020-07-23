const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
describe('Depletion of the Pending Queue LO and MO in the after match using hints', function() {
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
        baseBalance: 100000,
        baseAllowance: 100000
      },
      // seller
      '2': {
        secondaryBalance: 100000,
        secondaryAllowance: 100000
      }
    };
    await testHelper.setBalancesAndAllowances({ userData, accounts });
  };

  const givenTheTickIsRunning = function([, buyer, seller], scenario) {
    return describe('GIVEN the contract is running a tick', function() {
      before(async function() {
        // 4 orders so the matching has at least 2 steps to run
        await Promise.all([
          dex.insertBuyMarketOrder({ from: buyer }),
          dex.insertBuyLimitOrder({ from: buyer }),
          dex.insertSellMarketOrder({ from: seller }),
          dex.insertSellLimitOrder({ from: seller })
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

  const testOrderbookLength = (orderbookLengthGetter, isBuy) => expectedLength =>
    function() {
      return testHelper.assertBig(dex[orderbookLengthGetter](...pair, isBuy), expectedLength);
    };
  const testPendingSellMarketOrderLength = testOrderbookLength('pendingMarketOrdersLength', false);
  const testPendingMarketOrderBuyLength = testOrderbookLength('pendingMarketOrdersLength', true);
  const testPendingSellLimitOrderLength = testOrderbookLength('pendingSellOrdersLength');
  const testPendingBuyLimitOrderLength = testOrderbookLength('pendingBuyOrdersLength');
  const testMainSellLength = testOrderbookLength('sellOrdersLength');
  const testMainBuyLength = testOrderbookLength('buyOrdersLength');

  const testTickStage = expectedStage => () =>
    function() {
      return assertTickStage(testHelper.tickStages[expectedStage]);
    };
  const testIsReceivingOrders = testTickStage('RECEIVING_ORDERS');
  const testIsMatching = testTickStage('RUNNING_MATCHING');

  const testOrderAtIndex = orderbookOrderGetter => ({ expectedId, expectedIndex }) =>
    async function() {
      const order = await dex[orderbookOrderGetter](...pair, expectedIndex);
      return testHelper.assertBig(order.id, expectedId);
    };
  const testBuyOrderAtIndex = testOrderAtIndex('getBuyOrderAtIndex');
  const testSellOrderAtIndex = testOrderAtIndex('getSellOrderAtIndex');

  contract('SCENARIO: No pending orders', function(accounts) {
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are no pending orders', function() {
        describe('WHEN calling matchOrders with just the enough steps and an empty hint', function() {
          before(function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * check if needs to keep runing (not in this case) and finish the pagination
             */
            return dex.matchOrdersWithHints(...pair, 1, []);
          });
          it(
            'THEN the tick has ended and the contract is receiving orders again',
            testIsReceivingOrders()
          );
        });
      });
    });
  });

  contract('SCENARIO: 1 pending market order', function(accounts) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there is a sell pending MO', function() {
        before(function() {
          return dex.insertSellMarketOrder({
            from: seller,
            pending: true
          });
        });

        describe('WHEN calling matchOrders with just the enough steps and the hint to put it at the start', function() {
          before(function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * move the existing pending order and finish the pagination
             */
            return dex.matchOrdersWithHints(...pair, 1, [0]);
          });

          it(
            'THEN the pending order was moved into the main orderbook',
            testSellOrderAtIndex({
              expectedId: 5,
              expectedIndex: 0
            })
          );
          it('AND the sell pending queue becomes empty', testPendingSellMarketOrderLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(1));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract('SCENARIO: 1 pending limit order', function(accounts) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there is a sell pending LO', function() {
        before(function() {
          return dex.insertSellLimitOrder({
            from: seller,
            pending: true
          });
        });

        describe('WHEN calling matchOrders with just the enough steps and the hint to put it at the start', function() {
          before(function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * move the existing pending order and finish the pagination
             */
            return dex.matchOrdersWithHints(...pair, 1, [0]);
          });

          it(
            'THEN the pending LO was moved into the main orderbook',
            testSellOrderAtIndex({
              expectedId: 5,
              expectedIndex: 0
            })
          );
          it('AND the sell LO pending queue becomes empty', testPendingSellMarketOrderLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(1));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract(
    'SCENARIO: 3 pending market order with a hint pointing to orders in the queue and another is created later; the last hint can be missing',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are still 3 pending LO and 3 pending MO', function() {
          let hints;
          before(async function() {
            await Promise.all([
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order 5
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order 6
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order 7
              dex.insertSellLimitOrder({ from: seller, pending: true }), // Order 8
              dex.insertSellLimitOrder({ from: seller, pending: true }), // Order 9
              dex.insertSellLimitOrder({ from: seller, pending: true }) // Order 10
            ]);
            hints = [0, 8, 9]; // The hints are calculated before the insertion of the last one
          });

          describe('WHEN calling matchOrders with just the enough steps and the hints calculated before inserting the last one', function() {
            before(function() {
              /**
               * The paginated function needs to run one step to enter the second group,
               * move the existing pending order and finish the pagination
               */
              return dex.matchOrdersWithHints(...pair, 6, hints);
            });

            it(
              'THEN the first pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 8, expectedIndex: 0 })
            );
            it(
              'THEN the middle pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 9, expectedIndex: 1 })
            );
            it(
              'THEN the last pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 10, expectedIndex: 2 })
            );
            it('AND the sell pending MO queue is empty', testPendingSellMarketOrderLength(0));
            it('AND the sell pending LO queue is empty', testPendingSellLimitOrderLength(0));
            it('AND the sell orderbook has six orders', testMainSellLength(6));
            it('AND the contract is receiving orders again', testIsReceivingOrders());
          });
        });
      });
    }
  );

  contract(
    'SCENARIO: 3 pending buy LO and 3 pending buy MO with a hint pointing to orders in the queue and another is created later; the last hint can be missing',
    function(accounts) {
      const [, buyer] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are still 3 buy pending LO and 3 pending MO', function() {
          let hints;
          before(async function() {
            await Promise.all([
              dex.insertBuyLimitOrder({ from: buyer, pending: true }), // Order 5
              dex.insertBuyLimitOrder({ from: buyer, pending: true }), // Order 6
              dex.insertBuyLimitOrder({ from: buyer, pending: true }), // Order 7
              dex.insertBuyMarketOrder({ from: buyer, pending: true }), // Order 8
              dex.insertBuyMarketOrder({ from: buyer, pending: true }), // Order 9
              dex.insertBuyMarketOrder({ from: buyer, pending: true }) // Order 10
            ]);
            hints = [0, 5, 6]; // The hints are calculated before the insertion of the last one
          });

          describe('WHEN calling matchOrders with just the enough steps and the hints calculated before inserting the last one', function() {
            before(function() {
              /**
               * The paginated function needs to run one step to enter the second group,
               * move the existing pending order and finish the pagination
               */
              return dex.matchOrdersWithHints(...pair, 6, hints);
            });

            it(
              'THEN the first pending order was moved into the main orderbook',
              testBuyOrderAtIndex({ expectedId: 5, expectedIndex: 0 })
            );
            it(
              'THEN the middle pending order was moved into the main orderbook',
              testBuyOrderAtIndex({ expectedId: 6, expectedIndex: 1 })
            );
            it(
              'THEN the last pending order was moved into the main orderbook',
              testBuyOrderAtIndex({ expectedId: 7, expectedIndex: 2 })
            );
            it('AND the buy pending MO queue is empty', testPendingMarketOrderBuyLength(0));
            it('AND the buy pending LO queue is empty', testPendingBuyLimitOrderLength(0));
            it('AND the buy orderbook has six orders', testMainBuyLength(6));
            it('AND the contract is receiving orders again', testIsReceivingOrders());
          });
          describe('WHEN inserting two new pending orders', function() {
            before(async function() {
              await Promise.all([
                dex.insertBuyMarketOrder({ from: buyer }),
                dex.insertBuyLimitOrder({ from: buyer }),
                dex.insertBuyLimitOrder({ from: buyer })
              ]);
              await dex.matchOrders(...pair, 3);
            });
            it('AND the buy pending MO queue is empty', testPendingMarketOrderBuyLength(0));
            it('AND the buy orderbook has 8 orders', testMainBuyLength(9));
            it('AND the contract is still moving orders', testIsReceivingOrders());
          });
        });
      });
    }
  );

  contract('SCENARIO: 3 pending order with a hint pointing succesively to the start', function(
    accounts
  ) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are three sell orders pending', function() {
        before(async function() {
          // Order 5
          await dex.insertSellMarketOrder({
            from: seller,
            pending: true,
            priceMultiplier: DEFAULT_PRICE * 4
          });
          // Order 6
          await dex.insertSellMarketOrder({
            from: seller,
            pending: true,
            priceMultiplier: DEFAULT_PRICE * 2
          });
          // Order 7
          await dex.insertSellMarketOrder({
            from: seller,
            pending: true,
            priceMultiplier: DEFAULT_PRICE
          });
        });

        describe('WHEN calling matchOrders with just the enough steps and the hint to put it at the start', function() {
          before(async function() {
            await dex.matchOrdersWithHints(...pair, 3, [0, 0, 0]);
          });

          it(
            'THEN the last pending order was moved into the start of the main orderbook',
            testSellOrderAtIndex({ expectedId: 7, expectedIndex: 0 })
          );
          it(
            'THEN the middle pending order was moved into the main orderbook',
            testSellOrderAtIndex({ expectedId: 6, expectedIndex: 1 })
          );
          it(
            'THEN the first pending order was moved into the main orderbook',
            testSellOrderAtIndex({ expectedId: 5, expectedIndex: 2 })
          );
          it('AND the sell pending queue becomes empty', testPendingSellMarketOrderLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(3));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });
});
