/* NOTICE: this tests the paginated matching, but without paginated simulation
 * with paginated simulation, the required number of steps would be greater,
 * and this tests will have to change.
 */

const testHelperBuilder = require('../testHelpers/testHelper');

const initialPrice = 5;
describe('Matching can be run in several pages', function() {
  let dex;
  let base;
  let secondary;
  let pair;
  let assertTickStage;
  let assertSellerMatch;
  let assertBuyerMatch;
  let testHelper;
  let pricefy;
  const INITIAL_MARKET_PRICE = 2;
  const NEW_MARKET_PRICE = 3;
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
    return testHelper.assertBigPrice(emergentPrice, expected);
  };

  // FIXME this doesn't work for fields of the tokenPairStatus that are not prices
  const assertTokenPairStatus = async function(expected) {
    const actual = await dex.getTokenPairStatus.call(...pair);
    return Promise.all(
      Object.keys(expected).map(key => testHelper.assertBigPrice(actual[key], expected[key], key))
    );
  };

  const assertPageMemory = async function(expected) {
    const actual = await dex.getPageMemory.call(...pair);
    return Promise.all(
      Object.keys(expected).map(function(key) {
        if (['lastBuyMatchAmount', 'lastSellMatchAmount'].find(it => it === key))
          return testHelper.assertBigWad(actual[key], expected[key], key);
        if (['emergentPrice'].find(it => it === key))
          return testHelper.assertBigPrice(actual[key], expected[key], key);
        if (['marketPrice'].find(it => it === key))
          return testHelper.assertBigPrice(actual[key], expected[key], key);
        return testHelper.assertBig(actual[key], expected[key], key);
      })
    );
  };

  contract('matching orders step by step: two full matches at the same price', function(accounts) {
    const [, buyer, seller] = accounts;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN there are 2 buy and 2 sell orders which match 1v1', function() {
      before(async function() {
        await testHelper.setOracleMarketPrice(
          dex,
          base.address,
          secondary.address,
          INITIAL_MARKET_PRICE
        );

        // id: 1
        await dex.insertBuyMarketOrder({
          from: buyer,
          amount: INITIAL_MARKET_PRICE
        }); // buy 1
        // id: 2
        await dex.insertBuyMarketOrder({
          from: buyer,
          amount: INITIAL_MARKET_PRICE
        }); // buy 1
        // id: 3
        await dex.insertSellMarketOrder({ from: seller, amount: 1 }); // sell 1
        // id: 4
        await dex.insertSellMarketOrder({ from: seller, amount: 1 }); // sell 1
      });

      it('AND the pair is not running a tick', function() {
        return assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
      });
      it('AND the emergent price is 1, and lastClosingPrice is the initial', function() {
        return assertTokenPairStatus({
          emergentPrice: INITIAL_MARKET_PRICE,
          lastClosingPrice: initialPrice
        });
      });
      it('AND the page memory is empty', function() {
        return assertPageMemory({
          emergentPrice: 0, // its not the same as if we called the getEmergentPrice function
          lastBuyMatchId: 0,
          lastSellMatchId: 0,
          lastSellMatchAmount: 0,
          lastBuyMatchAmount: 0,
          matchesAmount: 0,
          marketPrice: 0
        });
      });

      describe('WHEN running matchOrders for the first simulation step', function() {
        before(function() {
          return dex.matchOrders(...pair, 1);
        });
        it('THEN the pair is in the running simulation stage', async function() {
          await assertTickStage(testHelper.tickStages.RUNNING_SIMULATION);
        });
        it('AND the emergent price is INITIAL_MARKET_PRICE', function() {
          return assertEmergentPrice(INITIAL_MARKET_PRICE);
        });
        it('AND the market price is already charged in the page memory', function() {
          return assertPageMemory({
            marketPrice: INITIAL_MARKET_PRICE
          });
        });
        describe('AND WHEN the price changes on the price provider', function() {
          before(async function() {
            await testHelper.setOracleMarketPrice(
              dex,
              base.address,
              secondary.address,
              NEW_MARKET_PRICE
            );
          });
          it('THEN the price used on the tick stays the same', function() {
            return assertPageMemory({
              marketPrice: INITIAL_MARKET_PRICE
            });
          });
          // first matching step
          describe('AND WHEN running matchOrders with the rest of the steps', function() {
            let matchingReceipt;
            before(async function() {
              matchingReceipt = await dex.matchOrders(...pair, 5);
            });
            it('AND the orders have matched at the initial market price', async function() {
              await assertBuyerMatch(matchingReceipt, {
                orderId: 1,
                amountSent: INITIAL_MARKET_PRICE,
                received: 1,
                commission: 0,
                remainingAmount: 0
              });
              await assertBuyerMatch(matchingReceipt, {
                orderId: 2,
                amountSent: INITIAL_MARKET_PRICE,
                received: 1,
                commission: 0,
                remainingAmount: 0
              });
              await assertSellerMatch(matchingReceipt, {
                orderId: 3,
                amountSent: 1,
                received: INITIAL_MARKET_PRICE,
                commission: 0,
                remainingAmount: 0
              });
              return assertSellerMatch(matchingReceipt, {
                orderId: 4,
                amountSent: 1,
                received: INITIAL_MARKET_PRICE,
                commission: 0,
                remainingAmount: 0
              });
            });
            it('AND the pair is receiving orders again', async function() {
              await assertTickStage(testHelper.tickStages.RECEIVING_ORDERS);
            });
            it('AND the emergent price is zero and last closing price is 1', async function() {
              await assertTokenPairStatus({
                emergentPrice: 0,
                lastClosingPrice: INITIAL_MARKET_PRICE
              });
            });
            it('AND the page memory is wiped', function() {
              // this should not change during matching
              return assertPageMemory({
                emergentPrice: 0,
                lastBuyMatchId: 0,
                lastSellMatchId: 0,
                lastSellMatchAmount: 0,
                lastBuyMatchAmount: 0,
                matchesAmount: 0,
                marketPrice: 0
              });
            });
          });
        });
      });
    });
  });
});
