/* NOTICE: this tests the paginated matching, but without paginated simulation
 * with paginated simulation, the required number of steps would be greater,
 * and this tests will have to change.
 */

const testHelperBuilder = require('../testHelpers/testHelper');

const initialPrice = 5;
describe('3 ticks with 3 different market prices', function() {
  let dex;
  let base;
  let secondary;
  let pair;
  let assertTickStage;
  let assertSellerMatch;
  let assertBuyerMatch;
  let testHelper;
  let pricefy;
  const INITIAL_MARKET_PRICE = 5;
  const SECOND_MARKET_PRICE = 20;
  const LAST_MARKET_PRICE = 100;
  const initContractsAndAllowance = (accounts, tickParams = {}) => async () => {
    testHelper = testHelperBuilder();
    ({ assertTickStage, pricefy, assertBuyerMatch, assertSellerMatch } = testHelper);
    await testHelper.createContracts(
      Object.assign(
        {},
        {
          useFakeDex: true,
          owner: accounts[0],
          ordersForTick: 2,
          maxBlocksForTick: 2,
          minBlocksForTick: 1,
          commission: {
            commissionRate: testHelper.wadify(0)
          },
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
        baseAllowance: 100000000,
        baseBalance: 100000000
      },
      // seller
      '2': {
        secondaryBalance: 100000000,
        secondaryAllowance: 100000000
      }
    };
    dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
    await testHelper.setBalancesAndAllowances({ userData, accounts });
  };
  const assertEmergentPrice = async function(expected) {
    const { emergentPrice } = await dex.getEmergentPrice.call(...pair);
    return testHelper.assertBigPrice(emergentPrice, expected);
  };
  const assertOrderBookLength = ({ type, expectedLength = 0 }) =>
    async function() {
      const lengthFn = type === 'buy' ? 'buyOrdersLength' : 'sellOrdersLength';
      const ordersLength = await dex[lengthFn](base.address, secondary.address);
      return testHelper.assertBig(ordersLength, expectedLength, `${type} orders length`);
    };

  contract('matching orders step by step: two full matches at the same price', function(accounts) {
    const [, buyer, seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN there is 1 buy big market order and 3 sell limit orders with different prices', function() {
      before(async function() {
        // id: 1
        await dex.insertBuyMarketOrder({
          from: buyer,
          amount: INITIAL_MARKET_PRICE * 10 + SECOND_MARKET_PRICE * 100 + LAST_MARKET_PRICE * 1000
        }); // buy 10 first time, 100 second time , 1000 last time

        // id: 2
        await dex.insertSellLimitOrder({
          from: seller,
          amount: 10,
          price: INITIAL_MARKET_PRICE - 2 // make emergent price different from the orders' price
        }); // sell 10

        // id: 3
        await dex.insertSellLimitOrder({
          from: seller,
          amount: 100,
          price: SECOND_MARKET_PRICE - 2 // make emergent price different from the orders' price
        }); // sell 100

        // id: 4
        await dex.insertSellLimitOrder({
          from: seller,
          amount: 1000,
          price: LAST_MARKET_PRICE - 2 // make emergent price different from the orders' price
        }); // sell 1000
      });

      it('AND the pair is not running a tick', function() {
        return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
      });
      describe(`WHEN the price changes to ${INITIAL_MARKET_PRICE}`, function() {
        before(async function() {
          await testHelper.setOracleMarketPrice(
            dex,
            base.address,
            secondary.address,
            INITIAL_MARKET_PRICE
          );
        });

        it(`THEN the emergent price is ${INITIAL_MARKET_PRICE}`, function() {
          return assertEmergentPrice(INITIAL_MARKET_PRICE - 1);
        });

        describe(`WHEN running matchOrders for the first time with the ${INITIAL_MARKET_PRICE}`, function() {
          let firstMatchingReceipt;
          before(async function() {
            firstMatchingReceipt = await dex.matchOrders(...pair, 5);
          });
          it('THEN the tick finished', async function() {
            await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
          });

          it(
            'THEN the sell orderbook has the other two orders',
            assertOrderBookLength({ type: 'sell', expectedLength: 2 })
          );

          it(
            'THEN the buy orderbook has the buy order',
            assertOrderBookLength({ type: 'buy', expectedLength: 1 })
          );

          it('THEN the buy matching event was emitted', async function() {
            return assertBuyerMatch(firstMatchingReceipt, {
              orderId: 1,
              amountSent: (INITIAL_MARKET_PRICE - 1) * 10,
              received: 10,
              commission: 0,
              remainingAmount: SECOND_MARKET_PRICE * 100 + LAST_MARKET_PRICE * 1000
            });
          });
          it('THEN the sell matching event was emitted', async function() {
            return assertSellerMatch(firstMatchingReceipt, {
              orderId: 2,
              amountSent: 10,
              received: (INITIAL_MARKET_PRICE - 1) * 10,
              commission: 0,
              remainingAmount: 0
            });
          });
          describe(`WHEN the price changes to ${SECOND_MARKET_PRICE}`, function() {
            before(async function() {
              await testHelper.setOracleMarketPrice(
                dex,
                base.address,
                secondary.address,
                SECOND_MARKET_PRICE
              );
            });

            it(`THEN the emergent price is ${SECOND_MARKET_PRICE}`, function() {
              return assertEmergentPrice(SECOND_MARKET_PRICE - 1);
            });

            describe(`WHEN running matchOrders for the first time with the ${SECOND_MARKET_PRICE}`, function() {
              let secondMatchingReceipt;
              before(async function() {
                secondMatchingReceipt = await dex.matchOrders(...pair, 5);
              });
              it('THEN the tick finished', async function() {
                await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
              });

              it(
                'THEN the sell orderbook has the other order',
                assertOrderBookLength({ type: 'sell', expectedLength: 1 })
              );

              it(
                'THEN the buy orderbook has the buy order',
                assertOrderBookLength({ type: 'buy', expectedLength: 1 })
              );

              it('THEN the buy matching event was emitted', async function() {
                return assertBuyerMatch(secondMatchingReceipt, {
                  orderId: 1,
                  amountSent: (SECOND_MARKET_PRICE - 1) * 100,
                  received: 100,
                  commission: 0,
                  remainingAmount: LAST_MARKET_PRICE * 1000
                });
              });
              it('THEN the sell matching event was emitted', async function() {
                return assertSellerMatch(secondMatchingReceipt, {
                  orderId: 3,
                  amountSent: 100,
                  received: (SECOND_MARKET_PRICE - 1) * 100,
                  commission: 0,
                  remainingAmount: 0
                });
              });
              describe(`WHEN the price changes to ${LAST_MARKET_PRICE}`, function() {
                before(async function() {
                  await testHelper.setOracleMarketPrice(
                    dex,
                    base.address,
                    secondary.address,
                    LAST_MARKET_PRICE
                  );
                });

                it(`THEN the emergent price is ${LAST_MARKET_PRICE}`, function() {
                  return assertEmergentPrice(LAST_MARKET_PRICE - 1);
                });

                describe(`WHEN running matchOrders for the first time with the ${LAST_MARKET_PRICE}`, function() {
                  let lastMatchingReceipt;
                  before(async function() {
                    lastMatchingReceipt = await dex.matchOrders(...pair, 5);
                  });
                  it('THEN the tick finished', async function() {
                    await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
                  });

                  it(
                    'THEN the sell orderbook has the other order',
                    assertOrderBookLength({ type: 'sell', expectedLength: 0 })
                  );

                  it(
                    'THEN the buy orderbook has the buy order',
                    assertOrderBookLength({ type: 'buy', expectedLength: 0 })
                  );

                  it('THEN the buy matching event was emitted', async function() {
                    return assertBuyerMatch(lastMatchingReceipt, {
                      orderId: 1,
                      amountSent: (LAST_MARKET_PRICE - 1) * 1000,
                      received: 1000,
                      commission: 0,
                      remainingAmount: 0
                    });
                  });
                  it('THEN the sell matching event was emitted', async function() {
                    return assertSellerMatch(lastMatchingReceipt, {
                      orderId: 4,
                      amountSent: 1000,
                      received: (LAST_MARKET_PRICE - 1) * 1000,
                      commission: 0,
                      remainingAmount: 0
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
