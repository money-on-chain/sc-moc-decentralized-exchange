const { BN, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('../testHelpers/testHelper');

let dex;
let commissionManager;
let base;
let secondary;
let assertAccountOrderSequence;
let assertExpiredOrderProcessed;
let txReceipt;
let testHelper;
let pair;
let isBuy = true;
let orderId;
const startFromTop = '0';
const noHint = '0';
const manySteps = '100';
let wadify;

const ERROR_NOT_MARKET_ORDER = 'The order to expire is not a market order';
const initContractsAndAllowance = async accounts => {
  await testHelper.createContracts({
    owner: accounts[0],
    useFakeDex: true, // We need Fake to manipulate order expired in Tick
    tokenPair: {}, // Will add the default base and secondary pair
    ordersForTick: 2,
    maxBlocksForTick: 2,
    minBlocksForTick: 1,
    commission: {
      commissionRate: wadify(0.1), // 10%
      expirationPenaltyRate: wadify(0.65) // 65%
    }
  });
  [dex, base, secondary, commissionManager] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary(),
    testHelper.getCommissionManager()
  ]);
  pair = [base.address, secondary.address];
  const userData = [1, 2, 3, 4, 5, 6].reduce(
    (acc, it) => ({
      ...acc,
      [it]: {
        baseBalance: 100,
        baseAllowance: 100,
        secondaryBalance: 100,
        secondaryAllowance: 100
      }
    }),
    {}
  );
  dex = testHelper.decorateOrderInsertions(dex, accounts, { base, secondary });
  dex = testHelper.decorateGetOrderAtIndex(dex);
  await testHelper.setBalancesAndAllowances({ accounts, userData });

  /**
   * Verifies that the given accountIndex sequence matches order setting
   */
  assertAccountOrderSequence = async (accountIndexSequence, fromBuy = true) => {
    const getAtIndex = fromBuy ? 'getBuyOrderAtIndex' : 'getSellOrderAtIndex';
    for (let i = 0; i < accountIndexSequence.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const order = await dex[getAtIndex](...pair, i);
      expect(order, `owner set incorrectly for ${i}`).to.have.property(
        'owner',
        accounts[accountIndexSequence[i]]
      );
      // verify than last order checked it is also the last listed order
      if (i === accountIndexSequence.length - 1) {
        expect(order.next.toString()).to.be.equals('0');
      }
    }
  };

  assertExpiredOrderProcessed = (expiredEventArgs, transferEventArgs) => {
    expectEvent.inLogs(txReceipt.logs, 'ExpiredOrderProcessed', expiredEventArgs);
    // Warning: WRBTC event arg names defer from Standard ERC20 abi
    return expectEvent.inTransaction(
      txReceipt.tx,
      testHelper.getBaseToken(), // Just needs the ERC20 abi
      'Transfer',
      transferEventArgs
    );
  };
};

describe('Process expired Market Order', function() {
  before(function() {
    testHelper = testHelperBuilder();
    ({ wadify } = testHelper);
  });

  contract('Dex Fake: trying to expire orders from an empty orderbook', function(accounts) {
    describe('GIVEN there is an empty orderdook', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // run match to move Tick number
        await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        await testHelper.assertBigWad(base.balanceOf(dex.address), 0);
      });
      describe('WHEN invoking buy processExpired for many buy market orders starting from top', function() {
        it('THEN there are not buy orders to expire', async function() {
          const thereAreOrdersToExpire = await dex.areOrdersToExpire(...pair, true);
          assert(!thereAreOrdersToExpire, 'There are buy market orders to expire');
        });
        it('THEN the transaction reverts as there is no order to process', function() {
          return expectRevert(
            dex.processExpired(...pair, true, startFromTop, noHint, manySteps, true),
            'No expired order found'
          );
        });
      });
      describe('WHEN invoking buy processExpired for many sell market orders starting from top', function() {
        it('THEN there are not sell orders to expire', async function() {
          const thereAreOrdersToExpire = await dex.areOrdersToExpire(...pair, false);
          assert(!thereAreOrdersToExpire, 'There are sell market orders to expire');
        });
        it('THEN the transaction reverts as there is no order to process', function() {
          return expectRevert(
            dex.processExpired(...pair, false, startFromTop, noHint, manySteps, true),
            'No expired order found'
          );
        });
      });
    });
  });

  contract('Dex Fake: Trying to expire limit orders with market orders params', function(accounts) {
    let createOrder;
    describe('GIVEN there is only one expired buy limit order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // run match to move Tick number
        await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        await testHelper.assertBigWad(base.balanceOf(dex.address), 0);
        createOrder = async () => {
          ({ id: orderId } = await dex.insertBuyLimitOrder({ accountIndex: 1 }));
          await dex.editOrder(...pair, orderId, isBuy, '1');
        };
      });
      describe('WHEN invoking buy processExpired with a limit order ID', function() {
        before(async function() {
          await createOrder();
        });
        it('THEN there is a buy orders to expire', async function() {
          const thereIsOrdersToExpire = await dex.areOrdersToExpire(...pair, isBuy);
          assert(thereIsOrdersToExpire, 'There is not an order to expire');
        });
        it('THEN the transaction reverts as not a market order', function() {
          return expectRevert(
            dex.processExpired(...pair, isBuy, orderId, noHint, '1', true),
            ERROR_NOT_MARKET_ORDER
          );
        });
      });
    });
  });

  contract(
    'Dex Fake: uses market order edit to manipulate and trying market orders expirations',
    function(accounts) {
      let createOrder;
      describe('GIVEN there is only one expired buy market order [E]', function() {
        before(async function() {
          await initContractsAndAllowance(accounts);
          // run match to move Tick number
          await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
          await testHelper.assertBigWad(base.balanceOf(dex.address), 0);
          createOrder = async () => {
            ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 1 }));
            await dex.editOrder(...pair, orderId, isBuy, '1');
          };
        });
        describe('WHEN invoking buy processExpired for many limit orders starting from top', function() {
          before(async function() {
            await createOrder();
          });
          it('THEN there is a buy orders to expire', async function() {
            const theIsBuyMOToExpire = await dex.areOrdersToExpire(...pair, isBuy);
            assert(theIsBuyMOToExpire, 'There is not a buy market orders to expire');
          });
          it('THEN the transaction reverts as there is no order to process', function() {
            const next = orderId.add(new BN(1));
            return expectRevert(
              dex.processExpired(...pair, isBuy, next, noHint, '1', false),
              'No expired order found'
            );
          });
        });
      });
    }
  );

  contract('Dex Fake: uses market order edit to manipulate expiration', function(accounts) {
    let createOrder;
    describe('GIVEN there is only one expired market order [E]', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        // run match to move Tick number
        await dex.matchOrders(...pair, testHelper.DEFAULT_STEPS_FOR_MATCHING);
        await testHelper.assertBigWad(base.balanceOf(dex.address), 0);
        createOrder = async () => {
          ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 1 }));
          await dex.editOrder(...pair, orderId, isBuy, '1');
        };
      });
      describe('WHEN invoking buy processExpired for many market orders starting from top', function() {
        before(async function() {
          await createOrder();
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN the market order has been processed with the correct value transfers', function() {
          return assertExpiredOrderProcessed(
            {
              orderId,
              returnedAmount: wadify(9),
              commission: wadify(0.65),
              returnedCommission: wadify(0.35)
            },
            { value: wadify(9.35), to: accounts[1] }
          );
        });
        it('AND the contract funds for the base token is the expected', function() {
          return testHelper.assertBigWad(
            commissionManager.exchangeCommissions(base.address),
            0.65,
            'Base funds'
          );
        });
        it('AND the contract balance for the base token is the expected', function() {
          return testHelper.assertBigWad(base.balanceOf(dex.address), 0.65, 'Base balance');
        });
      });
      describe('WHEN invoking buy processExpired for many market orders starting from it', function() {
        before(async function() {
          await createOrder();
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, noHint, manySteps, true);
        });
        it('THEN the order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[1] });
        });
      });
      describe('WHEN invoking buy processExpired for only 1 market order starting from it', function() {
        before(async function() {
          await createOrder();
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, noHint, '1', true);
        });
        it('THEN the order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[1] });
        });
      });
      describe('WHEN invoking buy processExpired with an invalid previous hint id', function() {
        before(async function() {
          await createOrder();
          const nextId = orderId.add(new BN(2));
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, nextId, manySteps, true);
        });
        it('THEN the order is processed as it is the first', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[1] });
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', function(accounts) {
    describe('GIVEN there are two sell and a third sell expired before [E, S, S]', function() {
      before(async function() {
        isBuy = false;
        await initContractsAndAllowance(accounts);
        ({ id: orderId } = await dex.insertSellMarketOrder({ accountIndex: 1 }));
        await dex.insertSellMarketOrder({ accountIndex: 2 });
        await dex.insertSellMarketOrder({ accountIndex: 3 });
        await dex.editOrder(...pair, orderId, isBuy, '1');
      });
      after(function() {
        isBuy = true;
      });
      describe('WHEN invoking sell processExpired for many orders starting from top', function() {
        before(async function() {
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN the market order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[1] });
        });
        it('AND the other two market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([2, 3], isBuy);
        });
      });
    });
  });

  contract('Dex Fake: uses market order edit to manipulate expiration', function(accounts) {
    describe('GIVEN there are two buy and a third expired in the middle [B, E, B]', function() {
      beforeEach(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertBuyMarketOrder({ accountIndex: 1 });
        ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 2 }));
        await dex.insertBuyMarketOrder({ accountIndex: 3 });
        await dex.editOrder(...pair, orderId, isBuy, '1');
      });
      describe('WHEN invoking buy processExpired for many market orders starting from top', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN the order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[2] });
        });
        it('AND the other two market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 3]);
        });
      });
      describe('WHEN invoking buy processExpired for many market orders starting from it', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, noHint, manySteps, true);
        });
        it('THEN the market order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[2] });
        });
        it('AND the other two market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 3]);
        });
      });
      describe('WHEN invoking buy processExpired for one market order starting from it, and hinting correct prev', function() {
        beforeEach(async function() {
          const correctPrevHint = orderId.sub(new BN(1));
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, correctPrevHint, '1', true);
        });
        it('THEN the market order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId }, { to: accounts[2] });
        });
        it('AND the other two market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 3]);
        });
      });
      describe('WHEN invoking buy processExpired for one order starting from it, and hinting incorrect prev', function() {
        it('THEN the tx reverts', function() {
          const inCorrectPrevHint = orderId.add(new BN(1));
          return expectRevert(
            dex.processExpired(...pair, isBuy, orderId, inCorrectPrevHint, '1', true),
            'Previous order not found'
          );
        });
      });
    });
    describe('WHEN invoking buy processExpired for one order starting from next one', function() {
      it('THEN the transaction reverts as there is no order to process', function() {
        const next = orderId.add(new BN(1));
        return expectRevert(
          dex.processExpired(...pair, isBuy, next, noHint, '1', true),
          'No expired order found'
        );
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', function(accounts) {
    describe('GIVEN there are two expired buy market orders between valid ones [B, E, B, E, B]', function() {
      let orderId2;
      beforeEach(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertBuyMarketOrder({ accountIndex: 1 });
        ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 2 }));
        await dex.insertBuyMarketOrder({ accountIndex: 3 });
        ({ id: orderId2 } = await dex.insertBuyMarketOrder({ accountIndex: 4 }));
        await dex.insertBuyMarketOrder({ accountIndex: 5 });
        await dex.editOrder(...pair, orderId, isBuy, '1');
        await dex.editOrder(...pair, orderId2, isBuy, '1');
      });
      describe('WHEN invoking buy processExpired for many market orders starting from top', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN both market order has been processed', async function() {
          await assertExpiredOrderProcessed({ orderId }, { to: accounts[2] });
          await assertExpiredOrderProcessed({ orderId: orderId2 }, { to: accounts[4] });
        });
        it('AND the other market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 3, 5]);
        });
      });
      describe('WHEN invoking buy processExpired for two order starting from the top', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(...pair, isBuy, startFromTop, noHint, '2', true);
        });
        it('THEN only first expired order gets processed', async function() {
          await assertExpiredOrderProcessed({ orderId }, { to: accounts[2] });
          return assertAccountOrderSequence([1, 3, 4, 5]);
        });
      });
      describe('WHEN invoking buy processExpired for one order starting from the second expired one, hinting previous', function() {
        beforeEach(async function() {
          const correctPrev = orderId2.sub(new BN(1));
          txReceipt = await dex.processExpired(...pair, isBuy, orderId2, correctPrev, '1', true);
        });
        it('THEN only the second expired order gets processed', async function() {
          await assertExpiredOrderProcessed({ orderId: orderId2 }, { to: accounts[4] });
          return assertAccountOrderSequence([1, 2, 3, 5]);
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', function(accounts) {
    describe('GIVEN there are two expired buy market orders before valid ones [B, B, B, E, E]', function() {
      let orderId2;
      beforeEach(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertBuyMarketOrder({ accountIndex: 1 });
        await dex.insertBuyMarketOrder({ accountIndex: 2 });
        await dex.insertBuyMarketOrder({ accountIndex: 3 });
        ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 4 }));
        ({ id: orderId2 } = await dex.insertBuyMarketOrder({ accountIndex: 5 }));
        await dex.editOrder(...pair, orderId, isBuy, '1');
        await dex.editOrder(...pair, orderId2, isBuy, '1');
      });

      it('THEN the DEX system should detect if there are order to expire', async function() {
        const thereAreOrderToExpire = await dex.areOrdersToExpire(pair[0], pair[1], isBuy);
        assert(thereAreOrderToExpire, 'The market orders to expire were not detected');
      });
      describe('WHEN invoking buy processExpired for many market orders starting from top', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN both order has been processed', async function() {
          await assertExpiredOrderProcessed({ orderId }, { to: accounts[4] });
          await assertExpiredOrderProcessed({ orderId: orderId2 }, { to: accounts[5] });
        });
        it('AND the other market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 2, 3]);
        });
      });
      describe('WHEN invoking buy processExpired for two market orders starting from the first expired', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(...pair, isBuy, orderId, noHint, '2', true);
        });
        it('THEN both order has been processed', async function() {
          await assertExpiredOrderProcessed({ orderId }, { to: accounts[4] });
          await assertExpiredOrderProcessed({ orderId: orderId2 }, { to: accounts[5] });
        });
        it('AND the other orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 2, 3]);
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', function(accounts) {
    describe('GIVEN there are two expired market buy market orders before valid ones [B, B, B, E, E]', function() {
      let orderId2;
      beforeEach(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertBuyMarketOrder({ accountIndex: 1 });
        await dex.insertBuyMarketOrder({ accountIndex: 2 });
        await dex.insertBuyMarketOrder({ accountIndex: 3 });
        ({ id: orderId } = await dex.insertBuyMarketOrder({ accountIndex: 4 }));
        ({ id: orderId2 } = await dex.insertBuyMarketOrder({ accountIndex: 5 }));
        await dex.editOrder(...pair, orderId, isBuy, '1');
        await dex.editOrder(...pair, orderId2, isBuy, '1');
      });
      it('THEN the DEX system should detect if there are order to expire', async function() {
        const thereAreOrderToExpire = await dex.areOrdersToExpire(pair[0], pair[1], isBuy);
        assert(thereAreOrderToExpire, 'The orders to expire were not detected');
      });
      describe('WHEN invoking buy processExpired for many orders starting from top', function() {
        beforeEach(async function() {
          txReceipt = await dex.processExpired(
            ...pair,
            isBuy,
            startFromTop,
            noHint,
            manySteps,
            true
          );
        });
        it('THEN both market order has been processed', async function() {
          await assertExpiredOrderProcessed({ orderId }, { to: accounts[4] });
          await assertExpiredOrderProcessed({ orderId: orderId2 }, { to: accounts[5] });
        });
        it('AND the other market orders remain in the orderbook', function() {
          return assertAccountOrderSequence([1, 2, 3]);
        });
        it('THEN the DEX system should detect that there are not market orders to expire', async function() {
          const thereAreOrderToExpire = await dex.areOrdersToExpire(pair[0], pair[1], isBuy);
          assert(!thereAreOrderToExpire, 'Orders to expire wrongly detected');
        });
      });
    });
  });
});
