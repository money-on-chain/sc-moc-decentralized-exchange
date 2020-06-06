/* NOTICE: this tests the paginated matching, but without paginated simulation
 * with paginated simulation, the required number of steps would be greater,
 * and this tests will have to change.
 */

const testHelperBuilder = require('../testHelpers/testHelper');

const initialPrice = 5;
// TODO Unskip once the matching of market orders is done
describe('Matching can be run in several pages', function() {
  let dex;
  let base;
  let secondary;
  let pair;
  let assertTickStage;
  let testHelper;
  let assertBig;
  let pricefy;
  let DEFAULT_PRICE;
  let DEFAULT_AMOUNT;
  const MARKET_PRICE = 15;
  const initContractsAndAllowance = (accounts, tickParams = {}) => async () => {
    testHelper = testHelperBuilder();
    ({ assertBig, assertTickStage, pricefy, DEFAULT_PRICE, DEFAULT_AMOUNT } = testHelper);
    await testHelper.createContracts(
      Object.assign(
        {},
        {
          useFakeDex: true,
          owner: accounts[0],
          ordersForTick: 2,
          maxBlocksForTick: 2,
          minBlocksForTick: 1,
          tokenPair: { initialPrice: pricefy(initialPrice) }
        },
        tickParams
      )
    );
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    pair = [base.address, secondary.address];

    assertTickStage = assertTickStage(dex, pair);

    const userData = {
      // buyer
      '1': {
        baseAllowance: 10000,
        baseBalance: 10000
      },
      // seller
      '2': {
        secondaryBalance: 10000,
        secondaryAllowance: 10000
      }
    };
    dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
    await testHelper.setBalancesAndAllowances({ userData, accounts });
  };
  const assertEmergentPrice = async function(expected) {
    const { emergentPrice } = await dex.getEmergentPrice.call(...pair);
    testHelper.assertBigPrice(emergentPrice, expected);
  };

  // FIXME this doesn't work for fields of the tokenPairStatus that are not prices
  const assertTokenPairStatus = async function(expected) {
    const actual = await dex.getTokenPairStatus.call(...pair);
    Object.keys(expected).forEach(function(key) {
      testHelper.assertBigPrice(actual[key], expected[key], key);
    });
  };

  const assertPageMemory = async function(expected) {
    const actual = await dex.getPageMemory.call(...pair);
    Object.keys(expected).forEach(function(key) {
      if (['lastBuyMatchAmount', 'lastSellMatchAmount'].find(it => it === key)) {
        testHelper.assertBigWad(actual[key], expected[key], key);
      } else if (['emergentPrice'].find(it => it === key)) {
        testHelper.assertBigPrice(actual[key], expected[key], key);
      } else {
        testHelper.assertBig(actual[key], expected[key], key);
      }
    });
  };

  /** RATIONALE: a bug was introduced which consisted on the counter for the amount of matches
   * of the tick not being cleared between ticks.
   * In this example: the tick duration is forced to 5 blocks, by matching 30 orders
   * The duration in blocks of a tick is determined by:
   *   nextBlockTarget = lastBlockTarget*(orderTarget/realOrders)
   * In the next tick, only 2 orders are matched.
   * If the counter is reset between ticks:
   *   nextBlockTarget = 5*(5/2) == 12.5
   * But if the counter is not reset:
   *   nextBlockTarget = 5*(5/32) == 0.78 (the minimum duration is set to 5, so it will be 5)
   */

  contract('Subsequent ticks reset the amount of matches - Market', function(accounts) {
    const [, buyer, seller] = accounts;
    const ordersForTick = 5;
    const maxBlocksForTick = 30;
    const minBlocksForTick = 5;
    before(
      initContractsAndAllowance(accounts, {
        ordersForTick,
        maxBlocksForTick,
        minBlocksForTick
      })
    );

    describe.skip('GIVEN a tick closed with a lot of orders (30)', function() {
      before(async function() {
        // Three steps to finish an empty tick
        await dex.matchOrders(...pair, 3);

        await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
        await Promise.all(
          [...new Array(15)].map(() =>
            Promise.all([
              dex.insertBuyMarketOrder({
                priceMultiplier: 1 / MARKET_PRICE,
                from: buyer
              }),
              dex.insertSellMarketOrder({
                priceMultiplier: 1 / MARKET_PRICE,
                from: seller
              })
            ])
          )
        );
        // It's not necessary to wait since we inserted 110 orders and the
        // max of blocks per tick is 100
        // One step per pair for simulation and one
        // step per pair for matching and one extra step to finish the tick
        await dex.matchOrders(...pair, 15 * 2 + 1);
      });
      it.skip('THEN the tick length is the minimum (5)', async function() {
        await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
        const { nextTickBlock, lastTickBlock } = await dex.getNextTick(...pair);
        assertBig(nextTickBlock.sub(lastTickBlock), minBlocksForTick);
      });

      describe('WHEN running a match with only two orders', function() {
        before(async function() {
          await dex.insertBuyMarketOrder({ from: buyer, priceMultiplier: 1 / 15 });
          await dex.insertSellMarketOrder({ from: seller, priceMultiplier: 1 / 15 });
          await testHelper.waitNBlocks(2);
          await dex.matchOrders(...pair, 25);
        });
        it.skip('THEN the tick length is extended', async function() {
          await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
          const { nextTickBlock, lastTickBlock } = await dex.getNextTick(...pair);
          assertBig(nextTickBlock.sub(lastTickBlock), 12);
        });
      });
    });
  });

  contract('matching orders step by step: two full matches at the same price', function(accounts) {
    const [, buyer, seller] = accounts;
    before(initContractsAndAllowance(accounts));
    describe('GIVEN there are 2 buy and 2 sell orders which match 1v1', function() {
      before(async function() {
        await dex.insertBuyMarketOrder({ from: buyer, priceMultiplier: 1 / 15 }); // id: 1
        await dex.insertBuyMarketOrder({ from: buyer, priceMultiplier: 1 / 15 }); // id: 2
        await dex.insertSellMarketOrder({ from: seller, priceMultiplier: 1 / 15 }); // id: 3
        await dex.insertSellMarketOrder({ from: seller, priceMultiplier: 1 / 15 }); // id: 4
      });

      it.skip('AND the pair is not running a tick', function() {
        return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
      });
      it.skip('AND the emergent price is 1, and lastClosingPrice is the initial', function() {
        return assertTokenPairStatus({ emergentPrice: 1, lastClosingPrice: initialPrice });
      });
      it.skip('AND the page memory is empty', function() {
        return assertPageMemory({
          emergentPrice: 0, // its not the same as if we called the getEmergentPrice function
          lastBuyMatchId: 0,
          lastSellMatchId: 0,
          lastSellMatchAmount: 0,
          lastBuyMatchAmount: 0,
          matchesAmount: 0
        });
      });

      describe('WHEN running matchOrders for the first simulation step', function() {
        before(function() {
          return dex.matchOrders(...pair, 1);
        });
        it.skip('THEN the pair is in the running simulation stage', async function() {
          await assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
        });
        it.skip('AND the emergent price is 1', function() {
          return assertEmergentPrice(1);
        });

        // second simulation step
        describe('AND WHEN running matchOrders for the second simulation step', function() {
          before(async function() {
            await dex.matchOrders(...pair, 1);
          });
          it.skip('THEN the pair is in the running simulation stage', function() {
            return assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
          });
          it.skip('AND no orders were matched or removed', async function() {
            const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
              dex.buyOrdersLength(...pair),
              dex.sellOrdersLength(...pair)
            ]);
            testHelper.assertBig(buyOrderbookLength, 2);
            testHelper.assertBig(sellOrderbookLength, 2);
          });
          it.skip('AND the emergent price is 1, and lastClosingPrice updated to 1', async function() {
            await assertTokenPairStatus({ emergentPrice: 1, lastClosingPrice: 1 });
          });

          it.skip('AND the page memory points to the second pair of orders', function() {
            // these orders did match, but since it was a full match,
            // the amount change is not persisted
            return assertPageMemory({
              emergentPrice: 1,
              lastBuyMatchId: 2,
              lastSellMatchId: 4,
              lastSellMatchAmount: 10,
              lastBuyMatchAmount: 10,
              matchesAmount: 4
            });
          });

          // first matching step
          describe('AND WHEN running matchOrders for the first matching step', function() {
            before(async function() {
              await dex.matchOrders(...pair, 1);
            });
            it.skip('THEN only one buy order and one sell order are matched', async function() {
              const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                dex.buyOrdersLength(...pair),
                dex.sellOrdersLength(...pair)
              ]);
              testHelper.assertBig(buyOrderbookLength, 1);
              testHelper.assertBig(sellOrderbookLength, 1);
            });
            it.skip('AND the pair is in the running matching stage', async function() {
              await assertTickStage(testHelper.tickStages.RUNNING_MATCHING);
            });
            it.skip('AND the emergent and last closing prices are 1', async function() {
              await assertTokenPairStatus({ emergentPrice: 1 });
            });

            it.skip('AND the page memory points to the second pair of orders', function() {
              // this should not change during matching
              return assertPageMemory({
                emergentPrice: 1,
                lastBuyMatchId: 2,
                lastSellMatchId: 4,
                lastSellMatchAmount: 10, // these orders did match,
                lastBuyMatchAmount: 10, // but since it was a full match, the amount is not
                matchesAmount: 4 // persisted
              });
            });

            // second matching step
            describe('AND WHEN running matchOrders for the second matching step', function() {
              before(async function() {
                await dex.matchOrders(...pair, 1);
              });
              it.skip('THEN both orderbooks are empty', async function() {
                const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                  dex.buyOrdersLength(...pair),
                  dex.sellOrdersLength(...pair)
                ]);
                testHelper.assertBig(buyOrderbookLength, 0);
                testHelper.assertBig(sellOrderbookLength, 0);
              });

              // finishing the moving of pending orders
              describe('AND WHEN running matchOrders for the second matching step', function() {
                before(async function() {
                  await dex.matchOrders(...pair, 1);
                });

                it.skip('AND the pair is receiving orders again', async function() {
                  await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
                });
                it.skip('AND the emergent price is zero and last closing price is 1', async function() {
                  await assertTokenPairStatus({ emergentPrice: 0, lastClosingPrice: 1 });
                });
                it.skip('AND the page memory is wiped', function() {
                  // this should not change during matching
                  return assertPageMemory({
                    emergentPrice: 0,
                    lastBuyMatchId: 0,
                    lastSellMatchId: 0,
                    lastSellMatchAmount: 0,
                    lastBuyMatchAmount: 0,
                    matchesAmount: 0
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  contract(
    'matching orders step by step: one pair matches completelly, the other doesnt due to price difference',
    function(accounts) {
      const [, buyer, seller] = accounts;
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a pair of orders that match and there are one buy and one sell orders which dont match due to price difference', function() {
        before(async function() {
          await dex.insertBuyMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE,
            from: buyer
          }); // id: 1
          await dex.insertSellMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE,
            from: seller
          }); // id: 2
          await dex.insertBuyMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE / 2,
            from: buyer
          }); // id: 3
          await dex.insertSellMarketOrder({
            priceMultiplier: 2 / MARKET_PRICE,
            from: seller
          }); // id: 4
        });

        it.skip('AND the pair is not running a tick', function() {
          return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
        });
        it.skip('AND the emergent price is the price of the initial pair, and lastClosingPrice is the initial', function() {
          return assertTokenPairStatus({
            emergentPrice: DEFAULT_PRICE,
            lastClosingPrice: initialPrice
          });
        });
        it.skip('AND the page memory is empty', function() {
          return assertPageMemory({
            emergentPrice: 0,
            lastBuyMatchId: 0,
            lastSellMatchId: 0,
            lastSellMatchAmount: 0,
            lastBuyMatchAmount: 0,
            matchesAmount: 0
          });
        });

        describe('WHEN running matchOrders for the first and only simulation step', function() {
          before(function() {
            return dex.matchOrders(...pair, 1);
          });
          it.skip('THEN the pair is in the running simulation stage', async function() {
            await assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
          });
          it.skip('AND no orders were matched or removed', async function() {
            const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
              dex.buyOrdersLength(...pair),
              dex.sellOrdersLength(...pair)
            ]);
            testHelper.assertBig(buyOrderbookLength, 2);
            testHelper.assertBig(sellOrderbookLength, 2);
          });
          it.skip('AND the emergent price is that of the first pair, and lastClosingPrice is the initial', function() {
            return assertTokenPairStatus({
              emergentPrice: DEFAULT_PRICE,
              lastClosingPrice: DEFAULT_PRICE
            });
          });
          it.skip('AND the page memory points to the first pair of orders(the other pair should not match)', function() {
            return assertPageMemory({
              emergentPrice: DEFAULT_PRICE,
              lastBuyMatchId: 1,
              lastSellMatchId: 2,
              lastSellMatchAmount: 10,
              lastBuyMatchAmount: 10,
              matchesAmount: 2
            });
          });
          describe('WHEN running matchOrders for the matching step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });
            it.skip('THEN the pair is in the running matching stage', async function() {
              await assertTickStage(testHelper.tickStages.RUNNING_MATCHING);
            });
            it.skip('AND the matching order were removed', async function() {
              const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                dex.buyOrdersLength(...pair),
                dex.sellOrdersLength(...pair)
              ]);
              testHelper.assertBig(buyOrderbookLength, 1);
              testHelper.assertBig(sellOrderbookLength, 1);
            });
            it.skip('AND the emergent price is 0 again, and lastClosingPrice doesnt change', function() {
              return assertTokenPairStatus({
                emergentPrice: 0,
                lastClosingPrice: DEFAULT_PRICE
              });
            });
            it.skip('AND the page memory points to the first pair of orders(the other pair should not match)', function() {
              return assertPageMemory({
                emergentPrice: DEFAULT_PRICE,
                lastBuyMatchId: 1,
                lastSellMatchId: 2,
                lastSellMatchAmount: 10,
                lastBuyMatchAmount: 10,
                matchesAmount: 2
              });
            });

            describe('AND WHEN running matchOrders with one step to close it', function() {
              before(async function() {
                await dex.matchOrders(...pair, 1);
              });
              it.skip('THEN orderbooks stay the same', async function() {
                const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                  dex.buyOrdersLength(...pair),
                  dex.sellOrdersLength(...pair)
                ]);
                testHelper.assertBig(buyOrderbookLength, 1);
                testHelper.assertBig(sellOrderbookLength, 1);
              });
              it.skip('AND there is no emergent price', async function() {
                await assertTokenPairStatus({ emergentPrice: 0 });
              });

              it.skip('THEN the page memory is wiped', function() {
                // this should not change during matching
                return assertPageMemory({
                  emergentPrice: 0,
                  lastBuyMatchId: 0,
                  lastSellMatchId: 0,
                  lastSellMatchAmount: 0,
                  lastBuyMatchAmount: 0,
                  matchesAmount: 0
                });
              });
              it.skip('AND the pair is receiving orders again', async function() {
                await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
              });

              it.skip('AND orderbooks stay the same', async function() {
                const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                  dex.buyOrdersLength(...pair),
                  dex.sellOrdersLength(...pair)
                ]);
                testHelper.assertBig(buyOrderbookLength, 1);
                testHelper.assertBig(sellOrderbookLength, 1);
              });
            });
          });
        });
      });
    }
  );

  contract(
    'matching orders step by step: one pair matches partially, leaving one to match other doesnt due to price difference',
    function(accounts) {
      const [, buyer, seller] = accounts;
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a pair of orders that matches partially, and another buy order with a lower price', function() {
        before(async function() {
          await dex.insertBuyMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE,
            from: buyer
          }); // id: 1, matches completelly
          // id: 2 matches partially
          await dex.insertSellMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE,
            from: seller,
            amount: DEFAULT_AMOUNT * 2
          });
          // id: 3 doesnt match with partial order 2
          await dex.insertBuyMarketOrder({
            priceMultiplier: 1 / MARKET_PRICE / 2,
            from: buyer
          });
        });

        it.skip('AND the pair is not running a tick', function() {
          return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
        });
        it.skip('AND the emergent price is the price of the initial pair, and lastClosingPrice is the initial', function() {
          return assertTokenPairStatus({
            emergentPrice: DEFAULT_PRICE,
            lastClosingPrice: initialPrice
          });
        });
        it.skip('AND the page memory is empty', function() {
          return assertPageMemory({
            emergentPrice: 0,
            lastBuyMatchId: 0,
            lastSellMatchId: 0,
            lastSellMatchAmount: 0,
            lastBuyMatchAmount: 0,
            matchesAmount: 0
          });
        });

        describe('WHEN running matchOrders for the first and only simulation step', function() {
          before(function() {
            return dex.matchOrders(...pair, 1);
          });
          it.skip('THEN the pair is in the running simulation stage', async function() {
            await assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
          });
          it.skip('AND no orders were matched or removed', async function() {
            const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
              dex.buyOrdersLength(...pair),
              dex.sellOrdersLength(...pair)
            ]);
            testHelper.assertBig(buyOrderbookLength, 2);
            testHelper.assertBig(sellOrderbookLength, 1);
          });
          it.skip('AND the emergent price and last closing price is equal to the price of the first pair', function() {
            return assertTokenPairStatus({
              emergentPrice: DEFAULT_PRICE,
              lastClosingPrice: DEFAULT_PRICE
            });
          });
          it.skip('AND the page memory points to the first pair or orders, matching completely only one', function() {
            return assertPageMemory({
              emergentPrice: DEFAULT_PRICE,
              lastBuyMatchId: 1,
              lastSellMatchId: 2,
              lastSellMatchAmount: 10,
              lastBuyMatchAmount: 10,
              matchesAmount: 1
            });
          });
          describe('WHEN running matchOrders for matching step', function() {
            before(function() {
              return dex.matchOrders(...pair, 1);
            });
            it.skip('THEN the pair is in the running matching stage', async function() {
              await assertTickStage(testHelper.tickStages.RUNNING_MATCHING);
            });
            it.skip('AND the buy order was removed ', async function() {
              const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                dex.buyOrdersLength(...pair),
                dex.sellOrdersLength(...pair)
              ]);
              testHelper.assertBig(buyOrderbookLength, 1);
              testHelper.assertBig(sellOrderbookLength, 1);
            });
            it.skip('AND the emergent price is 0 again, and lastClosingPrice is the still the same', function() {
              return assertTokenPairStatus({
                emergentPrice: 0,
                lastClosingPrice: DEFAULT_PRICE
              });
            });
            it.skip('AND the page memory points to the first pair of orders(the other order should not match)', function() {
              return assertPageMemory({
                emergentPrice: DEFAULT_PRICE,
                lastBuyMatchId: 1,
                lastSellMatchId: 2,
                lastSellMatchAmount: 10,
                lastBuyMatchAmount: 10,
                matchesAmount: 1
              });
            });
            describe('AND WHEN running matchOrders for finishing the moving of pending orders', function() {
              before(async function() {
                await dex.matchOrders(...pair, 1);
              });

              it.skip('THEN orderbooks stay the same', async function() {
                const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                  dex.buyOrdersLength(...pair),
                  dex.sellOrdersLength(...pair)
                ]);
                testHelper.assertBig(buyOrderbookLength, 1);
                testHelper.assertBig(sellOrderbookLength, 1);
              });
              it.skip('AND there is no emergent price', async function() {
                await assertTokenPairStatus({ emergentPrice: 0 });
              });

              it.skip('THEN the page memory is wiped', function() {
                // this should not change during matching
                return assertPageMemory({
                  emergentPrice: 0,
                  lastBuyMatchId: 0,
                  lastSellMatchId: 0,
                  lastSellMatchAmount: 0,
                  lastBuyMatchAmount: 0,
                  matchesAmount: 0
                });
              });
              it.skip('AND the pair is receiving orders again', async function() {
                await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
              });

              it.skip('AND orderbooks stay the same', async function() {
                const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                  dex.buyOrdersLength(...pair),
                  dex.sellOrdersLength(...pair)
                ]);
                testHelper.assertBig(buyOrderbookLength, 1);
                testHelper.assertBig(sellOrderbookLength, 1);
              });
            });
          });
        });
      });
    }
  );

  contract('matching orders step by step: zero matches due to price difference', function(
    accounts
  ) {
    const [, buyer, seller] = accounts;
    before(initContractsAndAllowance(accounts));
    describe('GIVEN there are one buy and one sell orders which dont match due to price difference', function() {
      before(async function() {
        await dex.insertBuyMarketOrder({
          priceMultiplier: 0.99,
          from: buyer
        }); // id: 1
        await dex.insertSellMarketOrder({
          priceMultiplier: 1.01,
          from: seller
        }); // id: 2
      });

      it.skip('AND the pair is not running a tick', function() {
        return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
      });
      it.skip('AND the emergent price is 0, and lastClosingPrice is the initial', function() {
        return assertTokenPairStatus({ emergentPrice: 0, lastClosingPrice: initialPrice });
      });
      it.skip('AND the page memory is empty', function() {
        return assertPageMemory({
          emergentPrice: 0,
          lastBuyMatchId: 0,
          lastSellMatchId: 0,
          lastSellMatchAmount: 0,
          lastBuyMatchAmount: 0,
          matchesAmount: 0
        });
      });

      describe('WHEN running matchOrders for the first simulation step', function() {
        before(function() {
          return dex.matchOrders(...pair, 1);
        });
        it.skip('THEN the pair is in the running simulation stage', async function() {
          await assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
        });
        it.skip('AND no orders were matched or removed', async function() {
          const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
            dex.buyOrdersLength(...pair),
            dex.sellOrdersLength(...pair)
          ]);
          testHelper.assertBig(buyOrderbookLength, 1);
          testHelper.assertBig(sellOrderbookLength, 1);
        });
        it.skip('AND the emergent price is 0, and lastClosingPrice is the initial', function() {
          return assertTokenPairStatus({ emergentPrice: 0, lastClosingPrice: initialPrice });
        });
        it.skip('AND the page memory points to the first pair or orders', function() {
          return assertPageMemory({
            emergentPrice: 0,
            lastBuyMatchId: 1,
            lastSellMatchId: 2,
            lastSellMatchAmount: 10, // these orders didn't match
            lastBuyMatchAmount: 10,
            matchesAmount: 0
          });
        });

        // first matching step
        describe('AND WHEN running matchOrders for the matching', function() {
          before(async function() {
            await dex.matchOrders(...pair, 1);
          });
          it.skip('THEN orderbooks stay the same', async function() {
            const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
              dex.buyOrdersLength(...pair),
              dex.sellOrdersLength(...pair)
            ]);
            testHelper.assertBig(buyOrderbookLength, 1);
            testHelper.assertBig(sellOrderbookLength, 1);
          });
          it.skip('AND there is no emergent price', async function() {
            await assertTokenPairStatus({ emergentPrice: 0 });
          });
          // finishing the moving of pending orders
          describe('AND WHEN running matchOrders for the second matching step', function() {
            before(async function() {
              await dex.matchOrders(...pair, 1);
            });
            it.skip('THEN the page memory is wiped', function() {
              // this should not change during matching
              return assertPageMemory({
                emergentPrice: 0,
                lastBuyMatchId: 0,
                lastSellMatchId: 0,
                lastSellMatchAmount: 0,
                lastBuyMatchAmount: 0,
                matchesAmount: 0
              });
            });
            it.skip('AND the pair is receiving orders again', async function() {
              await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
            });

            it.skip('AND orderbooks stay the same', async function() {
              const [buyOrderbookLength, sellOrderbookLength] = await Promise.all([
                dex.buyOrdersLength(...pair),
                dex.sellOrdersLength(...pair)
              ]);
              testHelper.assertBig(buyOrderbookLength, 1);
              testHelper.assertBig(sellOrderbookLength, 1);
            });
          });
        });
      });
    });
  });

  /** RATIONALE: given that the tick execution may now span multiple blocks,
   * it's important that:
   * - the duration for the next tick is added to the block in which the tick execution ends
   *    - this could cause a tick of negative duration, effectively enabling the tick as soon
   *      as it starts.
   * - the blocks spanned by the last tick should NOT include the
   *   blocks spanned executing the tick itself, and the amount of pending orders
   *   should not be considered in the calculation for the tick(this is untestable for now)
   *    - this could enable an attacker to artificially shorten the next tick duration by
   *      inserting lots of orders to the pending queue and then cancelling them.
   */

  contract('matching orders in two steps with a lot of blocks between them', function(accounts) {
    const [, buyer, seller] = accounts;
    before(
      initContractsAndAllowance(accounts, {
        ordersForTick: 8,
        maxBlocksForTick: 100,
        minBlocksForTick: 2
      })
    );

    describe('GIVEN that a tick has just run with zero orders, forcing the tick length to be the maximum (100)', function() {
      before(function() {
        return dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
      });

      describe('AND there are the double of expected orders for the tick', function() {
        before(async function() {
          await Promise.all(
            [...new Array(8)].map(() =>
              Promise.all([
                dex.insertBuyMarketOrder({
                  priceMultiplier: 1 / MARKET_PRICE,
                  from: buyer
                }),
                dex.insertSellMarketOrder({
                  priceMultiplier: 1 / MARKET_PRICE,
                  from: seller
                })
              ])
            )
          );
        });

        describe('AND the tick is ready to run', function() {
          before(async function() {
            const { nextTickBlock } = await dex.getNextTick(...pair);
            await testHelper.waitNBlocks(nextTickBlock - (await testHelper.getBlockNumber()));
          });
          it.skip('AND the pair is not running a tick', function() {
            return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
          });
          it.skip('AND the emergent price is 1', function() {
            return assertTokenPairStatus({ emergentPrice: 1 });
          });

          describe('WHEN running all the simulation and matching orders with one step', function() {
            let blockWhenTickStarted;
            before(async function() {
              ({
                receipt: { blockNumber: blockWhenTickStarted }
              } = await dex.matchOrders(...pair, 8 + 1));
            });
            it.skip('THEN only one buy order and one sell order are matched', async function() {
              return Promise.all([
                assertBig(dex.buyOrdersLength(...pair), 7, 'Buy orderbook length'),
                assertBig(dex.sellOrdersLength(...pair), 7, 'Sell orderbook length')
              ]);
            });
            it.skip('AND the pair is in the running matching stage', function() {
              return assertTickStage(testHelper.tickStages.RUNNING_MATCHING);
            });

            describe('WHEN waiting several blocks', function() {
              before(function() {
                return testHelper.waitNBlocks(100);
              });
              describe('AND matching orders with just enough steps(7 to finish the matching and one more to finish the moving pending orders)', function() {
                before(function() {
                  return dex.matchOrders(...pair, 8);
                });
                it.skip('THEN both orderbooks are empty', function() {
                  return Promise.all([
                    assertBig(dex.buyOrdersLength(...pair), 0, 'Buy orderbook length'),
                    assertBig(dex.sellOrdersLength(...pair), 0, 'Sell orderbook length')
                  ]);
                });
                it.skip('AND the pair is receiving orders again', function() {
                  return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
                });
                it.skip('AND there is no emergent price', function() {
                  return assertEmergentPrice(0);
                });
                it.skip('AND the lastTickBlock is the one when the tick started', async function() {
                  const { lastTickBlock } = await dex.getNextTick(...pair);
                  assertBig(lastTickBlock, blockWhenTickStarted, 'Block When Tick Started');
                });
                // The amount of blocks it took to run the matching should not be
                // considered as tick duration.
                it.skip('AND the next tick spans half as many blocks as the previous one(50)', async function() {
                  const { nextTickBlock, lastTickBlock } = await dex.getNextTick(...pair);
                  assertBig(nextTickBlock.sub(lastTickBlock), 50, 'Blocks until next tick');
                });
              });
            });
          });
        });
      });
    });
  });
  // It is kind of a stress test so we dont want to run it every time
  // because it may make the test to long to run
  contract(
    'The pagination make a tick able to finish no matter how many orders there are to be processed, and its types',
    function(accounts) {
      const [, buyer, seller] = accounts;
      before(initContractsAndAllowance(accounts));
      const totalOrdersPerType = 100;
      describe(`GIVEN there are ${totalOrdersPerType} orders of buy and ${totalOrdersPerType} of sell`, function() {
        before(async function() {
          await Promise.all(
            [...Array(totalOrdersPerType)].map(() =>
              dex.insertBuyLimitOrder({
                from: buyer
              })
            )
          );
          await Promise.all(
            [...Array(totalOrdersPerType)].map(() =>
              dex.insertSellLimitOrder({
                from: seller
              })
            )
          );
        });
        describe('AND half of them are expired, the ones which are in the middle', function() {
          before(async function() {
            // buy
            await Promise.all(
              [...Array(totalOrdersPerType / 2).keys()].map(i =>
                dex.editOrder(...pair, i + totalOrdersPerType / 4, true, '0')
              )
            );
            // sell
            await Promise.all(
              [...Array(totalOrdersPerType / 2).keys()].map(i =>
                dex.editOrder(...pair, i + totalOrdersPerType + totalOrdersPerType / 4, false, '0')
              )
            );
          });
          const pendingOrdersAmount = 40;
          describe(`AND after the tick started ${pendingOrdersAmount} pending orders of each type were added`, function() {
            before(async function() {
              await dex.matchOrders(...pair, 1);
              await Promise.all(
                [...Array(pendingOrdersAmount)].map(() =>
                  dex.insertBuyLimitOrder({
                    from: buyer,
                    pending: true
                  })
                )
              );
              await Promise.all(
                [...Array(pendingOrdersAmount)].map(() =>
                  dex.insertSellLimitOrder({
                    from: seller,
                    pending: true
                  })
                )
              );
            });
            describe('WHEN matchOrders is run enough times with tiny steps until the moving of orders is reached, previously processing expired orders', function() {
              before(async function() {
                await dex.processExpired(
                  ...pair,
                  true,
                  totalOrdersPerType / 4,
                  totalOrdersPerType / 4 - 1,
                  totalOrdersPerType / 2
                );
                await dex.processExpired(
                  ...pair,
                  false,
                  totalOrdersPerType / 4 + totalOrdersPerType,
                  totalOrdersPerType / 4 - 1 + totalOrdersPerType,
                  totalOrdersPerType / 2
                );

                let currentStage = await dex.getTickStage(...pair);
                while (currentStage.toNumber() !== testHelper.tickStages.MOVING_PENDING_ORDERS) {
                  // eslint-disable-next-line no-await-in-loop
                  await dex.matchOrders(...pair, 1, { gas: 8e5 });
                  // eslint-disable-next-line no-await-in-loop
                  currentStage = await dex.getTickStage(...pair);
                }
              });
              describe('AND the pending orders are moved', function() {
                before(async function() {
                  const pendingOrderStartId = totalOrdersPerType * 2 + 1;

                  // moving buy orders
                  await [...Array(pendingOrdersAmount - 1).keys()].reduce(
                    (acc, i) =>
                      acc.then(() =>
                        dex.matchOrdersWithHints(...pair, 1, [i + pendingOrderStartId], {
                          gas: 2e5
                        })
                      ),
                    Promise.resolve()
                  );

                  await dex.matchOrdersWithHints(...pair, 1, [0], { gas: 2e5 });

                  // moving sell orders
                  await [...Array(pendingOrdersAmount - 1).keys()].reduce(
                    (acc, i) =>
                      acc.then(() =>
                        dex.matchOrdersWithHints(
                          ...pair,
                          1,
                          [i + pendingOrderStartId + pendingOrdersAmount],
                          {
                            gas: 5e5
                          }
                        )
                      ),
                    Promise.resolve()
                  );
                });
                it.skip('THEN the process ends succesfully and the contract  is receiving orders again', async function() {
                  await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
                });
              });
            });
          });
        });
      });
    }
  );
});
