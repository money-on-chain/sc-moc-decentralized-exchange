const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
describe('Depletion of the Pending Queue in the after match', function() {
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

  const givenTheTickIsRunning = function([, buyer, seller], scenario) {
    return describe('GIVEN the contract is running a tick', function() {
      before(async function() {
        // 4 orders so the matching has at least 2 steps to run
        await Promise.all([
          dex.insertBuyLimitOrder({ from: buyer }),
          dex.insertBuyLimitOrder({ from: buyer }),
          dex.insertSellLimitOrder({ from: seller }),
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

  const testOrderbookLength = orderbookLengthGetter => expectedLength =>
    function() {
      return testHelper.assertBig(dex[orderbookLengthGetter](...pair), expectedLength);
    };
  const testPendingSellLength = testOrderbookLength('pendingSellOrdersLength');
  const testPendingBuyLength = testOrderbookLength('pendingBuyOrdersLength');
  const testMainSellLength = testOrderbookLength('sellOrdersLength');
  const testMainBuyLength = testOrderbookLength('buyOrdersLength');

  const testTickStage = expectedStage => () =>
    function() {
      return assertTickStage(testHelper.tickStages[expectedStage]);
    };
  const testIsReceivingOrders = testTickStage('RECEIVING_ORDERS');
  const testIsMatching = testTickStage('RUNNING_MATCHING');
  const testIsMovingOrders = testTickStage('MOVING_PENDING_ORDERS');

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
        describe('WHEN calling matchOrders with just the enough steps', function() {
          before(function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * check if needs to keep runing (not in this case) and finish the pagination
             */
            return dex.matchOrders(...pair, 1);
          });
          it(
            'THEN the tick has ended and the contract is receiving orders again',
            testIsReceivingOrders()
          );
        });
      });
    });
  });

  contract('SCENARIO: 1 pending order', function(accounts) {
    const [, , seller] = accounts;
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there is a sell order pending', function() {
        before(function() {
          return dex.insertSellLimitOrder({ from: seller, pending: true });
        });

        it('THEN the pending sell orderbook length is 1', testPendingSellLength(1));
        describe('WHEN calling matchOrders with just enough steps', function() {
          before(function() {
            /**
             * The paginated function needs to run one step to enter the second group,
             * move the existing pending order and finish the pagination
             */
            return dex.matchOrders(...pair, 1);
          });

          it(
            'THEN the pending order was moved into the main orderbook',
            testSellOrderAtIndex({ expectedId: 5, expectedIndex: 0 })
          );
          it('AND the sell pending queue becomes empty', testPendingSellLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(1));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract(
    'SCENARIO: 2 pending sell order inserted with decreasing price; we move them in the order which they were inserted',
    function(accounts) {
      const [, , seller] = accounts;
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are two sell orders pending', function() {
          before(async function() {
            await dex.insertSellLimitOrder({
              from: seller,
              pending: true,
              price: DEFAULT_PRICE * 2
            });
            await dex.insertSellLimitOrder({ from: seller, pending: true, price: DEFAULT_PRICE });
          });

          describe('WHEN calling matchOrders with just one step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });

            it(
              'THEN the first inserted pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 5, expectedIndex: 0 })
            );
            it('AND the sell pending queue has still one order', testPendingSellLength(1));
            it(
              'AND the last inserted pending order is still in the pending queue',
              testMainSellLength(1)
            );
            it('AND the contract is still moving orders', testIsMovingOrders());
          });

          describe('WHEN calling matchOrders with another step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });

            it(
              'THEN the last inserted order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 6, expectedIndex: 0 })
            );
            it('AND the sell pending queue becomes empty', testPendingSellLength(0));
            it('AND the sell orderbook has one order', testMainSellLength(2));
            it('AND the contract is receiving orders again', testIsReceivingOrders());
          });
        });
      });
    }
  );

  contract('SCENARIO: N pending orders', function(accounts) {
    const [, buyer, seller] = accounts;
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are 2 pending buy orders and 2 pending sell orders', function() {
        before(function() {
          return Promise.all([
            dex.insertBuyLimitOrder({ from: buyer, pending: true }),
            dex.insertBuyLimitOrder({ from: buyer, pending: true }),
            dex.insertSellLimitOrder({ from: seller, pending: true }),
            dex.insertSellLimitOrder({ from: seller, pending: true })
          ]);
        });
        it('THEN the pending buy queue length is two', testPendingBuyLength(2));
        it('AND the pending sell queue length is two', testPendingSellLength(2));
        describe('WHEN calling matchOrders with just one step', function() {
          before(function() {
            return dex.matchOrders(...pair, 1);
          });

          it(
            'THEN the first pending buy order was moved into the main orderbook',
            testBuyOrderAtIndex({ expectedId: 5, expectedIndex: 0 })
          );
          it(
            'AND the other pending buy order remains in the pending queue',
            testPendingBuyLength(1)
          );
          it('AND the contract is still moving pending orders', testIsMovingOrders());
          describe('AND WHEN calling again matchOrders with just two steps', function() {
            before(function() {
              return dex.matchOrders(...pair, 2);
            });

            it(
              'THEN the second buy order was moved into the main orderbook',
              testBuyOrderAtIndex({ expectedId: 6, expectedIndex: 1 })
            );
            it('AND the buy orderbook has exactly two orders', testMainBuyLength(2));
            it('AND pending buy queue is empty', testPendingBuyLength(0));
            it(
              'AND the first sell order was moved to the main orderbook',
              testSellOrderAtIndex({ expectedId: 7, expectedIndex: 0 })
            );
            it('AND the sell orderbook has one order', testMainSellLength(1));
            it('AND the sell pending queue has one order', testPendingSellLength(1));
            it('AND the contract is still moving pending orders', testIsMovingOrders());
            describe('AND GIVEN a new buy order is inserted', function() {
              before(function() {
                return dex.insertBuyLimitOrder({ from: buyer, pending: true });
              });

              describe('WHEN calling matchOrders with just one steps', function() {
                before(function() {
                  return dex.matchOrders(...pair, 1);
                });

                it(
                  'THEN the new pending buy order was moved into the main orderbook',
                  testBuyOrderAtIndex({ expectedId: 9, expectedIndex: 2 })
                );
                it('AND the buy orderbook has exactly three orders', testMainBuyLength(3));
                it('AND pending buy queue is empty again', testPendingBuyLength(0));
                it(
                  'AND there is still one pending sell orders in the pending queue',
                  testPendingSellLength(1)
                );
                it('AND the contract is still moving pending orders', testIsMovingOrders());

                describe('AND GIVEN a new buy order is inserted with a more competitive price', function() {
                  before(function() {
                    return dex.insertBuyLimitOrder({
                      from: buyer,
                      pending: true,
                      price: DEFAULT_PRICE * 2
                    });
                  });
                  describe('WHEN calling matchOrders with just one steps', function() {
                    before(function() {
                      return dex.matchOrders(...pair, 1);
                    });

                    it(
                      'THEN the new pending buy order was moved into the main orderbook as the first order',
                      testBuyOrderAtIndex({ expectedId: 10, expectedIndex: 0 })
                    );
                    it('AND the buy orderbook has exactly four orders', testMainBuyLength(4));
                    it('AND pending buy queue is empty again', testPendingBuyLength(0));
                    it('AND the contract is still moving pending orders', testIsMovingOrders());
                    describe('AND WHEN calling matchOrders with just one step for the last time', function() {
                      before(function() {
                        return dex.matchOrders(...pair, 1);
                      });

                      it('AND the pending queue is empty', testPendingSellLength(0));
                      it('AND the sell orderbook has two orders', testMainSellLength(2));
                      it(
                        'THEN the last pending sell order was moved into the main orderbook',
                        testSellOrderAtIndex({ expectedId: 8, expectedIndex: 1 })
                      );
                      it('AND the contract is receiving orders again', testIsReceivingOrders());
                      describe('AND WHEN a new order is inserted', function() {
                        before(function() {
                          return dex.insertBuyLimitOrder({ from: buyer });
                        });

                        it(
                          'THEN the order ends directly in the main orderbook',
                          testBuyOrderAtIndex({ expectedId: 11, expectedIndex: 4 })
                        );
                        it('AND the pending queue remains empty', testPendingBuyLength(0));
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
