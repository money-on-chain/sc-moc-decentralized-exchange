const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
describe('Deletion of Orders from the Pending Queue in the after match', function() {
  let dex;
  let base;
  let secondary;
  let pair;
  let assertTickStage;
  let DEFAULT_PRICE;
  const DEFAULT_MULTIPLY_FACTOR = 1;

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
    pair = [base.address, secondary.address];
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
  const testPendingBuyMarketOrderLength = testOrderbookLength('pendingMarketOrdersLength', true);
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

  contract('SCENARIO: 1 pending market order', function(accounts) {
    const [, , seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there is a sell order pending', function() {
        before(function() {
          return dex.insertSellMarketOrder({
            from: seller,
            pending: true
          });
        });

        it('THEN the pending sell orderbook length is 1', testPendingSellMarketOrderLength(1));
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
      describe('AND a new sell pending LO is inserted', function() {
        before(function() {
          return dex.insertSellLimitOrder({
            from: seller,
            pending: true
          });
        });

        it('THEN the pending sell orderbook length is 1', testPendingSellLimitOrderLength(1));
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
            testSellOrderAtIndex({
              expectedId: 5,
              expectedIndex: 0
            })
          );
          it('AND the sell pending queue becomes empty', testPendingSellLimitOrderLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(1));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract(
    'SCENARIO: 2 pending sell market order and 2 pending sell limit order inserted with decreasing multiplyFactor we move them in the order which they were inserted',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are 2 pending sell MO and 2 pending sell MO', function() {
          before(async function() {
            await dex.insertSellMarketOrder({
              from: seller,
              pending: true,
              priceMultiplier: DEFAULT_MULTIPLY_FACTOR * 2
            });
            await dex.insertSellLimitOrder({
              from: seller,
              pending: true,
              price: DEFAULT_PRICE * 2
            });
            await dex.insertSellMarketOrder({
              from: seller,
              pending: true,
              priceMultiplier: DEFAULT_MULTIPLY_FACTOR
            });
            await dex.insertSellLimitOrder({
              from: seller,
              pending: true,
              price: DEFAULT_PRICE
            });
          });

          describe('WHEN calling matchOrders with just one step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });

            it(
              'THEN the first inserted pending LO was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 6, expectedIndex: 0 })
            );
            it(
              'AND the sell pending LO queue contains an orders',
              testPendingSellLimitOrderLength(1)
            );
            it(
              'AND the sell pending MO queue has still two orders',
              testPendingSellMarketOrderLength(2)
            );
            it('AND there are 1 inserted  order in the orderbook', testMainSellLength(1));
            it('AND the contract is still moving orders', testIsMovingOrders());
          });

          describe('WHEN calling matchOrders with another step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });
            it(
              'THEN the las sell pending LO was removed from pending queue',
              testPendingSellLimitOrderLength(0)
            );
            it(
              'AND the first sell pending MO was also removed from the pending',
              testPendingSellMarketOrderLength(1)
            );
            it('AND the sell orderbook has three orders', testMainSellLength(3));
            it('AND the contract is still moving orders', testIsMovingOrders());
          });

          describe('WHEN calling matchOrders with one more step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });
            it('THE the sell pending MO is empty', testPendingSellMarketOrderLength(0));
            it('AND the sell orderbook has four orders', testMainSellLength(4));
            it('AND the contract is receiving orders again', testIsReceivingOrders());
          });
        });
      });
    }
  );

  contract('SCENARIO: N pending orders', function(accounts) {
    const [, buyer, seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are 2 pending buy orders and 2 pending sell orders', function() {
        before(function() {
          return Promise.all([
            dex.insertBuyMarketOrder({
              from: buyer,
              pending: true
            }),
            dex.insertBuyLimitOrder({
              from: buyer,
              pending: true
            }),
            dex.insertBuyMarketOrder({
              from: buyer,
              pending: true
            }),
            dex.insertSellMarketOrder({
              from: seller,
              pending: true
            }),
            dex.insertSellMarketOrder({
              from: seller,
              pending: true
            }),
            dex.insertSellLimitOrder({
              from: seller,
              pending: true
            })
          ]);
        });
        it('THEN the pending buy MO queue length is one', testPendingBuyMarketOrderLength(2));
        it('AND the pending sell MO queue length is two', testPendingSellMarketOrderLength(2));
        it('AND the pending buy LO queue length is one', testPendingBuyLimitOrderLength(1));
        it('AND the pending sell LO queue length is two', testPendingSellLimitOrderLength(1));
        describe('WHEN calling matchOrders with just one step', function() {
          before(function() {
            return dex.matchOrders(...pair, 1);
          });

          it(
            'THEN the first pending buy limit order was moved into the main orderbook',
            testBuyOrderAtIndex({
              expectedId: 6,
              expectedIndex: 0
            })
          );
          it(
            'AND the pending sell limit order queue still has one LO',
            testPendingSellLimitOrderLength(1)
          );
          it(
            'AND the pending buy market order queue still has two MO',
            testPendingBuyMarketOrderLength(2)
          );
          it('AND the pending buy limit order queue is empty', testPendingBuyLimitOrderLength(0));
          it(
            'AND the pending sell market order queue still has two MO',
            testPendingSellMarketOrderLength(2)
          );
          it('AND the buy orderbook has exactly one order', testMainBuyLength(1));
          it('AND the contract is still moving pending orders', testIsMovingOrders());

          describe('AND WHEN calling again matchOrders with just two steps', function() {
            before(function() {
              return dex.matchOrders(...pair, 2);
            });

            it(
              'THEN the second buy order was moved into the main orderbook',
              testBuyOrderAtIndex({
                expectedId: 7,
                expectedIndex: 1
              })
            );
            it('AND the buy orderbook has exactly two orders', testMainBuyLength(3));
            it('AND pending buy MO queue is empty', testPendingBuyMarketOrderLength(0));
            it(
              'AND the first sell order was moved to the main orderbook',
              testSellOrderAtIndex({
                expectedId: 10,
                expectedIndex: 0
              })
            );
            it('AND the sell orderbook has one order', testMainSellLength(1));
            it('AND the sell pending MO queue has two order', testPendingSellMarketOrderLength(2));
            it('AND the contract is still moving pending orders', testIsMovingOrders());

            describe('AND GIVEN a new buy order is inserted', function() {
              before(function() {
                return dex.insertBuyMarketOrder({
                  from: buyer,
                  pending: true
                });
              });

              describe('WHEN calling matchOrders with just one steps', function() {
                before(function() {
                  return dex.matchOrders(...pair, 1);
                });

                it(
                  'THEN the new pending buy order was moved into the main orderbook',
                  testBuyOrderAtIndex({
                    expectedId: 11,
                    expectedIndex: 2
                  })
                );
                it('AND the buy orderbook has exactly four orders', testMainBuyLength(4));
                it('AND pending buy MO queue is empty again', testPendingBuyMarketOrderLength(0));
                it(
                  'AND the sell pending MO queue has two order',
                  testPendingSellMarketOrderLength(2)
                );
                it('AND pending buy LO queue is empty', testPendingBuyLimitOrderLength(0));
                it('AND pending sell LO queue is empty again', testPendingSellLimitOrderLength(0));
                it('AND the contract is still moving pending orders', testIsMovingOrders());

                describe('AND GIVEN a new buy order is inserted with a more competitive price', function() {
                  before(function() {
                    return dex.insertBuyMarketOrder({
                      from: buyer,
                      pending: true,
                      priceMultiplier: DEFAULT_MULTIPLY_FACTOR * 2
                    });
                  });
                  describe('WHEN calling matchOrders with just one steps', function() {
                    before(function() {
                      return dex.matchOrders(...pair, 1);
                    });
                    it('AND the buy orderbook has exactly five orders', testMainBuyLength(5));
                    it('AND pending buy queue is empty again', testPendingBuyMarketOrderLength(0));
                    it('AND the contract is still moving pending orders', testIsMovingOrders());

                    describe('AND WHEN calling matchOrders with two steps for the last time', function() {
                      before(function() {
                        return dex.matchOrders(...pair, 2);
                      });

                      it('AND the pending queue is empty', testPendingSellMarketOrderLength(0));
                      it('AND the sell orderbook has two orders', testMainSellLength(3));
                      it('AND the buy orderbook has exactly five orders', testMainBuyLength(5));
                      it(
                        'THEN the befor last pending sell order was moved into the main orderbook',
                        testSellOrderAtIndex({
                          expectedId: 10,
                          expectedIndex: 0
                        })
                      );
                      it(
                        'THEN the last pending sell order was moved into the main orderbook',
                        testSellOrderAtIndex({
                          expectedId: 9,
                          expectedIndex: 1
                        })
                      );
                      it('AND the contract is receiving orders again', testIsReceivingOrders());

                      describe('AND WHEN a new order is inserted', function() {
                        before(function() {
                          return dex.insertSellMarketOrder({
                            from: seller
                          });
                        });

                        it(
                          'THEN the order ends directly in the main orderbook',
                          testSellOrderAtIndex({
                            expectedId: 13,
                            expectedIndex: 2
                          })
                        );
                        it(
                          'AND the pending queue remains empty',
                          testPendingSellMarketOrderLength(0)
                        );
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
