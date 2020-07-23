const testHelperBuilder = require('../testHelpers/testHelper');

let testHelper;
describe('Depletion of the Pending Queue MO in the after match using hints', function() {
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
          dex.insertBuyMarketOrder({ from: buyer }),
          dex.insertSellMarketOrder({ from: seller }),
          dex.insertSellMarketOrder({ from: seller })
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
  const testPendingSellLength = testOrderbookLength('pendingMarketOrdersLength', false);
  const testPendingBuyLength = testOrderbookLength('pendingMarketOrdersLength', true);
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

  contract('SCENARIO: No pending market orders', function(accounts) {
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are no pending market orders', function() {
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
          it('AND the sell pending queue becomes empty', testPendingSellLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(1));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract(
    'SCENARIO: N pending market orders put at the same time, matched with hints consume less gas',
    function(accounts) {
      const [, , seller] = accounts;
      const ordersInTheOrderbookBefore = 20;
      const amountOfOrders = 40;
      const orderIndexOffset = ordersInTheOrderbookBefore;
      const orderIdOffset = ordersInTheOrderbookBefore + 4 + 1;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are still sell orders pending', function() {
          before(async function() {
            // Insert one extra at the start to keep the tick going
            await dex.insertSellMarketOrder({ from: seller, pending: true });

            await [...Array(ordersInTheOrderbookBefore)].reduce(async previousPromise => {
              await previousPromise;
              await dex.insertSellMarketOrder({ from: seller, pending: true });
              await dex.matchOrders(...pair, 1, { gas: 6e6 });
            }, Promise.resolve());

            // Insert amountOfOrders - 1 to keep exactly amountOfOrders pending
            return Promise.all(
              [...Array(amountOfOrders - 1)].map(() =>
                dex.insertSellMarketOrder({ from: seller, pending: true })
              )
            );
          });
          describe('WHEN calling matchOrders with just the enough steps and the necessary hints', function() {
            before(function() {
              /**
               * The paginated function needs to run one step to enter the second group,
               * move the existing pending order and finish the pagination
               */
              const hints = [...Array(amountOfOrders).keys()].map(
                index => index + orderIdOffset - 1
              );
              return dex.matchOrdersWithHints(...pair, amountOfOrders, hints, {
                gas: 6e6
              });
            });

            it(
              'THEN the first pending market order was moved into the main orderbook',
              testSellOrderAtIndex({
                expectedId: orderIdOffset,
                expectedIndex: orderIndexOffset
              })
            );
            it(
              'THEN the last pending market order was moved into the main orderbook',
              testSellOrderAtIndex({
                expectedId: orderIdOffset + amountOfOrders - 1,
                expectedIndex: orderIndexOffset + amountOfOrders - 1
              })
            );
            it('AND the sell pending queue becomes empty', testPendingSellLength(0));
            it(
              'AND the sell orderbook has all the orders inserted in the pending queue',
              testMainSellLength(amountOfOrders + ordersInTheOrderbookBefore)
            );
            it('AND the contract is receiving orders again', testIsReceivingOrders());
          });
        });
      });
    }
  );

  contract(
    'SCENARIO: 3 pending market order with a hint pointing to orders in the queue and another is created later; the last hint can be missing',
    function(accounts) {
      const [, , seller] = accounts;
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      givenTheTickIsRunning(accounts, function() {
        describe('AND there are still 3 sell order pending', function() {
          let hints;
          before(async function() {
            await Promise.all([
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order 5
              dex.insertSellMarketOrder({ from: seller, pending: true }), // Order 6
              dex.insertSellMarketOrder({ from: seller, pending: true }) // Order 7
            ]);
            hints = [0, 5, 6]; // The hints are calculated before the insertion of the last one
            await dex.insertSellMarketOrder({ from: seller, pending: true }); // Order 8
          });

          describe('WHEN calling matchOrders with just the enough steps and the hints calculated before inserting the last one', function() {
            before(function() {
              /**
               * The paginated function needs to run one step to enter the second group,
               * move the existing pending order and finish the pagination
               */
              return dex.matchOrdersWithHints(...pair, 3, hints);
            });

            it(
              'THEN the first pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 5, expectedIndex: 0 })
            );
            it(
              'THEN the middle pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 6, expectedIndex: 1 })
            );
            it(
              'THEN the last pending order was moved into the main orderbook',
              testSellOrderAtIndex({ expectedId: 7, expectedIndex: 2 })
            );
            it('AND the sell pending MO queue still has the last order', testPendingSellLength(1));
            it('AND the sell orderbook has three orders', testMainSellLength(3));
            it('AND the contract is still moving orders', testIsMovingOrders());
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
          it('AND the sell pending queue becomes empty', testPendingSellLength(0));
          it('AND the sell orderbook has one order', testMainSellLength(3));
          it('AND the contract is receiving orders again', testIsReceivingOrders());
        });
      });
    });
  });

  contract('SCENARIO: N pending orders', function(accounts) {
    const [, buyer, seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    givenTheTickIsRunning(accounts, function() {
      describe('AND there are 2 pending buy orders and 2 pending sell orders', function() {
        before(function() {
          return Promise.all([
            dex.insertBuyMarketOrder({ from: buyer, pending: true }),
            dex.insertBuyMarketOrder({ from: buyer, pending: true }),

            dex.insertSellMarketOrder({ from: seller, pending: true }),
            dex.insertSellMarketOrder({ from: seller, pending: true })
          ]);
        });
        it('THEN the pending buy queue length is two', testPendingBuyLength(2));
        it('AND the pending sell queue length is two', testPendingSellLength(2));
        describe('WHEN calling matchOrders with just one step and the hint to be put at the start', function() {
          before(function() {
            return dex.matchOrdersWithHints(...pair, 1, [0]);
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
          describe('AND WHEN calling again matchOrders with just two steps and the correct hint', function() {
            before(function() {
              return dex.matchOrdersWithHints(...pair, 2, [5, 0]);
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
                return dex.insertBuyMarketOrder({ from: buyer, pending: true });
              });
              describe('WHEN calling matchOrders with just one steps and the correct hint', function() {
                before(function() {
                  return dex.matchOrdersWithHints(...pair, 1, [6]);
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
                    return dex.insertBuyMarketOrder({
                      from: buyer,
                      pending: true,
                      priceMultiplier: DEFAULT_PRICE * 2
                    });
                  });
                  describe('WHEN calling matchOrders with just one steps', function() {
                    before(function() {
                      return dex.matchOrdersWithHints(...pair, 1, [0]);
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
                        return dex.matchOrdersWithHints(...pair, 1, [7]);
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
                          return dex.insertBuyMarketOrder({ from: buyer });
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
