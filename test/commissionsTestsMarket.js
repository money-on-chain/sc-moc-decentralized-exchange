/**
 * This test aim to cover the different scenarios on which orders are matched, canceled or expired
 * and the contract has to charge the commissions.
 */
const { expectEvent } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let dex;
let commissionManager;
let base;
let secondary;
let otherSecondary;
let assertBuyerMatch;
let assertSellerMatch;
let txReceipt;
let testHelper;
let wadify;
let gov;
let DEFAULT_ACCOUNT_INDEX;
let pair;
const MARKET_PRICE = 2;

const assertDexCommissionBalances = ({ expectedBaseTokenBalance, expectedSecondaryTokenBalance }) =>
  function() {
    return Promise.all([
      testHelper.assertBigWad(
        commissionManager.exchangeCommissions(base.address),
        expectedBaseTokenBalance
      ),
      testHelper.assertBigWad(
        commissionManager.exchangeCommissions(secondary.address),
        expectedSecondaryTokenBalance
      )
    ]);
  };

const initContractsAndAllowance = async accounts => {
  await testHelper.createContracts({
    owner: accounts[0],
    customBeneficiaryAddress: accounts[0],
    commission: {
      commissionRate: wadify(0.1), // 10%
      cancelationPenaltyRate: wadify(0.25), // 25%
      expirationPenaltyRate: wadify(0.75) // 75%
    },
    tokenPair: {}, // Will add the default base and secondary pair
    ordersForTick: 2,
    maxBlocksForTick: 2,
    minBlocksForTick: 1
  });

  [dex, commissionManager, base, secondary, otherSecondary, gov, priceProvider] = await Promise.all([
    testHelper.getDex(),
    testHelper.getCommissionManager(),
    testHelper.getBase(),
    testHelper.getSecondary(),
    testHelper.getOwnerBurnableToken().new(),
    testHelper.getGovernor(),
    testHelper.getTokenPriceProviderFake().new()
  ]);
  dex = testHelper.decorateGovernedSetters(dex);
  dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
  pair = [base.address, secondary.address];
  await testHelper.setBalancesAndAllowances({ accounts });
};

describe('Commissions tests - Market order should behave as a market order if the price does not change ', function() {
  before(function() {
    testHelper = testHelperBuilder();
    ({ wadify, assertBuyerMatch, assertSellerMatch, DEFAULT_ACCOUNT_INDEX } = testHelper);
  });

  contract('Dex: Commission 10%, full match', accounts => {
    describe('GIVEN there are two buy and sell order that fully match', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // Assuming a base price of MARKET_PRICE
        // orderId: 1
        await dex.insertBuyMarketOrder({ amount: 15, priceMultiplier: 15 / MARKET_PRICE });
        // orderId: 2
        await dex.insertSellMarketOrder({ amount: 1, priceMultiplier: 15 / MARKET_PRICE });

        await testHelper.assertBig(
          await dex.buyOrdersLength(base.address, secondary.address),
          1,
          'buyOrdersLength'
        );

        await testHelper.assertBig(
          await dex.sellOrdersLength(base.address, secondary.address),
          1,
          'sellOrdersLength'
        );
      });
      describe('WHEN instructed to match orders', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it('THEN match events are emitted', async function() {
          await assertBuyerMatch(txReceipt, {
            orderId: 1,
            amountSent: 13.5,
            received: 0.9,
            commission: 1.5,
            remainingAmount: 0
          });
          return assertSellerMatch(txReceipt, {
            orderId: 2,
            amountSent: 0.9,
            received: 13.5,
            commission: 0.1,
            remainingAmount: 0
          });
        });

        it(
          'AND the funds have increased',
          assertDexCommissionBalances({
            expectedBaseTokenBalance: 1.5,
            expectedSecondaryTokenBalance: 0.1
          })
        );
        it('AND the buy orderbook is empty', async function() {
          return testHelper.assertBig(
            await dex.buyOrdersLength(base.address, secondary.address),
            0,
            'buyOrdersLength'
          );
        });
        it('AND the sell orderbook is empty', async function() {
          return testHelper.assertBig(
            await dex.sellOrdersLength(base.address, secondary.address),
            0,
            'sellOrdersLength'
          );
        });
      });
    });
  });

  contract('Dex: Commission 10%, partial match', accounts => {
    describe('GIVEN there is a buy order that match partially', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // Assuming a base price of MARKET_PRICE
        // orderId: 1
        await dex.insertBuyMarketOrder({ amount: 17, priceMultiplier: 1 / MARKET_PRICE });
        // orderId: 2
        await dex.insertSellMarketOrder({ amount: 12, priceMultiplier: 1 / MARKET_PRICE });
      });
      describe('WHEN instructed to match orders', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it('THEN full match events is emitted', async function() {
          await assertBuyerMatch(txReceipt, {
            orderId: 1,
            received: 10.8,
            amountSent: 10.8,
            commission: 1.2,
            remainingAmount: 4.5
          });
          return assertSellerMatch(txReceipt, {
            orderId: 2,
            amountSent: 10.8,
            received: 10.8,
            commission: 1.2,
            remainingAmount: 0
          });
        });

        it(
          'AND the funds have increased',
          assertDexCommissionBalances({
            expectedBaseTokenBalance: 1.2,
            expectedSecondaryTokenBalance: 1.2
          })
        );
      });

      describe('AND WHEN instructed to match with a new order that fully matches the modified one', function() {
        before(async function() {
          // orderId: 3
          await dex.insertSellMarketOrder({ amount: 5, priceMultiplier: 1 / MARKET_PRICE });
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it('THEN full match events are emitted', async function() {
          await assertBuyerMatch(txReceipt, {
            orderId: 1,
            received: 4.5,
            commission: 0.5,
            remainingAmount: 0
          });
          return assertSellerMatch(txReceipt, {
            orderId: 3,
            amountSent: 4.5,
            commission: 0.5,
            remainingAmount: 0
          });
        });

        it(
          'AND the funds have increased',
          assertDexCommissionBalances({
            expectedBaseTokenBalance: 1.7,
            expectedSecondaryTokenBalance: 1.7
          })
        );
      });
    });
  });

  contract('Dex: Commission 10%, two different token pairs', accounts => {
    describe('GIVEN there are orders for 2 different token pairs', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        //set initial price
        await priceProvider.poke(testHelper.DEFAULT_PRICE_PRECISION.toString());
        await dex.addTokenPair(
          base.address,
          otherSecondary.address,
          priceProvider.address,
          testHelper.DEFAULT_PRICE_PRECISION.toString(),
          testHelper.DEFAULT_PRICE_PRECISION.toString(),
          gov
        );
        await testHelper.setBalancesAndAllowances({
          accounts,
          secondary: otherSecondary
        });

        await dex.insertBuyMarketOrder({
          amount: 15,
          secondary: otherSecondary,
          priceMultiplier: 1 / MARKET_PRICE
        }); // orderId: 1
        await dex.insertSellMarketOrder({
          amount: 15,
          secondary: otherSecondary,
          priceMultiplier: 1 / MARKET_PRICE
        }); // orderId: 2

        // orderId: 3
        await dex.insertBuyMarketOrder({ amount: 20, priceMultiplier: 1 / MARKET_PRICE });
        // orderId: 4
        await dex.insertSellMarketOrder({ amount: 20, priceMultiplier: 1 / MARKET_PRICE });
      });
      describe('WHEN instructed to match orders', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it(
          'AND the funds have increased',
          assertDexCommissionBalances({
            expectedBaseTokenBalance: 2,
            expectedSecondaryTokenBalance: 2
          })
        );
      });
      describe('AND WHEN instructed to match the other pair', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            otherSecondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it('THEN full match events are emitted', async function() {
          await assertBuyerMatch(txReceipt, {
            orderId: 1,
            received: 13.5,
            commission: 1.5,
            remainingAmount: 0
          });
          return assertSellerMatch(txReceipt, {
            orderId: 2,
            amountSent: 13.5,
            commission: 1.5,
            remainingAmount: 0
          });
        });

        it('AND the funds for the secondary token have increased', function() {
          return testHelper.assertBigWad(
            commissionManager.exchangeCommissions(otherSecondary.address),
            1.5
          );
        });

        it('AND the funds for the base token have increased as expected', function() {
          return testHelper.assertBigWad(commissionManager.exchangeCommissions(base.address), 3.5);
        });

        it('AND the funds for the secondary token for the first pair are still the same', function() {
          return testHelper.assertBigWad(
            commissionManager.exchangeCommissions(secondary.address),
            2
          );
        });
      });
    });
  });

  contract('Dex: Commission 10%, full match with surplus and change', accounts => {
    describe('GIVEN there are two buy and sell order that fully match with different prices', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // orderId: 1
        await dex.insertBuyMarketOrder({ amount: 60, priceMultiplier: 20 / MARKET_PRICE });
        // orderId: 2
        await dex.insertSellMarketOrder({ amount: 3, priceMultiplier: 10 / MARKET_PRICE });
      });
      describe('WHEN instructed to match orders', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });

        it('THEN full match events are emitted', async function() {
          await assertBuyerMatch(txReceipt, {
            orderId: 1,
            amountSent: 40.5,
            received: 2.7,
            commission: 4.5,
            change: 15,
            remainingAmount: 0
          });
          return assertSellerMatch(txReceipt, {
            orderId: 2,
            received: 40.5,
            amountSent: 2.7,
            commission: 0.3,
            remainingAmount: 0
          });
        });

        it(
          'AND the funds have increased',
          assertDexCommissionBalances({
            expectedBaseTokenBalance: 4.5,
            expectedSecondaryTokenBalance: 0.3
          })
        );
      });
    });
  });

  contract(
    'Dex: Commission 10%, cancelation penalty 25%, new buy order canceled',
    async accounts => {
      describe('GIVEN there is a buy order', function() {
        before(async function() {
          await initContractsAndAllowance(accounts);
          // orderId: 1
          await dex.insertBuyMarketOrder({ amount: 17, priceMultiplier: 1 / MARKET_PRICE });
        });
        it('AND the buy orderbook length is updated accordingly', async function() {
          return testHelper.assertBig(await dex.buyOrdersLength(...pair), 1, 'buyOrdersLength');
        });
        describe('WHEN the order is canceled', function() {
          before(async function() {
            txReceipt = await dex.cancelBuyOrder(base.address, secondary.address, 1, 0, {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            });
          });
          it('THEN the order cancelled event is emitted', function() {
            expectEvent.inLogs(txReceipt.logs, 'OrderCancelled', {
              id: '1',
              sender: accounts[DEFAULT_ACCOUNT_INDEX],
              returnedAmount: wadify(15.3),
              commission: wadify(0.425),
              returnedCommission: wadify(1.275),
              isBuy: true
            });
          });

          it('AND the transfer was successful', function() {
            return expectEvent.inTransaction(
              txReceipt.tx,
              testHelper.getBaseToken(), // Just needs the ERC20 abi
              'Transfer',
              { value: wadify(16.575), to: accounts[DEFAULT_ACCOUNT_INDEX] }
            );
          });

          it(
            'AND the funds have increased',
            assertDexCommissionBalances({
              expectedBaseTokenBalance: 0.425,
              expectedSecondaryTokenBalance: 0
            })
          );
          it('AND the buy orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(await dex.buyOrdersLength(...pair), 0, 'buyOrdersLength');
          });
        });
      });
    }
  );

  contract(
    'Dex: Commission 10%, cancelation penalty 25%, sell order partialy matched canceled',
    async accounts => {
      describe('GIVEN there is a sell order that match partially', function() {
        before(async function() {
          await initContractsAndAllowance(accounts);
          // orderId: 1
          await dex.insertBuyMarketOrder({ amount: 12, priceMultiplier: 1 / MARKET_PRICE });
          // orderId: 1
          await dex.insertSellMarketOrder({ amount: 17, priceMultiplier: 1 / MARKET_PRICE });
          await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN the orderbook contains sell orders', async function() {
          return testHelper.assertBig(
            await dex.sellOrdersLength(base.address, secondary.address),
            1,
            'sellOrdersLength'
          );
        });
        it('THEN the buy orderbook is empty', async function() {
          return testHelper.assertBig(
            await dex.buyOrdersLength(base.address, secondary.address),
            0,
            'sellOrdersLength'
          );
        });
        describe('WHEN the sell order is canceled', function() {
          before(async function() {
            txReceipt = await dex.cancelSellOrder(base.address, secondary.address, 2, 0, {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            });
          });

          it('THEN the order cancelled event is emitted', function() {
            expectEvent.inLogs(txReceipt.logs, 'OrderCancelled', {
              id: '2',
              sender: accounts[DEFAULT_ACCOUNT_INDEX],
              returnedAmount: wadify(4.5),
              commission: wadify(0.125),
              returnedCommission: wadify(0.375),
              isBuy: false
            });
          });

          it('AND the transfer was successful', function() {
            return expectEvent.inTransaction(
              txReceipt.tx,
              testHelper.getSecondaryToken(), // Just needs the ERC20 abi
              'Transfer',
              { value: wadify(4.875), to: accounts[DEFAULT_ACCOUNT_INDEX] }
            );
          });

          it(
            'AND the funds have increased',
            assertDexCommissionBalances({
              expectedBaseTokenBalance: 1.2,
              expectedSecondaryTokenBalance: 1.325
            })
          );
          it('THEN the sell orderbooks empty', async function() {
            return testHelper.assertBig(
              await dex.sellOrdersLength(base.address, secondary.address),
              0,
              'sellOrdersLength'
            );
          });
        });
      });
    }
  );
});
