/**
 * This test aim to cover the different scenarios on which expired Orders
 * remain on the order-book at tick execution and needs to be ignored
 * on price discovery and matching but processed as expired (refunded).
 */
const { expectEvent } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('../testHelpers/testHelper');

let dex;
let base;
let secondary;
let insertBuyLimitOrder;
let insertSellLimitOrder;
let assertSellAccountOrderSequence;
let assertBuySellMatchEvents;
let assertExpiredOrderProcessed;
let txReceipt;
let testHelper;
let wadify;
let pricefy;

const insertLimitOrder = ({ type, accounts, accountIndex, ...props }) =>
  function() {
    const insertFn = type === 'buy' ? 'insertBuyLimitOrder' : 'insertSellLimitOrder';
    const amount = wadify(props.amount || 10);
    const price = pricefy(props.price || 1);
    const expiresInTick = props.expiresInTick || 5;
    const from = props.from || accounts[accountIndex];
    return dex[insertFn](base.address, secondary.address, amount, price, expiresInTick, { from });
  };

const insertMarketOrder = ({ type, accounts, accountIndex, ...props }) =>
  function() {
    const amount = wadify(props.amount || 10);
    const price = pricefy(props.price || 1);
    const expiresInTick = props.expiresInTick || 5;
    const from = props.from || accounts[accountIndex];
    return dex.insertMarketOrder(
      base.address,
      secondary.address,
      amount,
      price,
      expiresInTick,
      type === 'buy',
      {
        from
      }
    );
  };

const assertOrderBookLength = ({ type, expectedLength = 0 }) =>
  async function() {
    const lengthFn = type === 'buy' ? 'buyOrdersLength' : 'sellOrdersLength';
    const ordersLength = await dex[lengthFn](base.address, secondary.address);
    return testHelper.assertBig(ordersLength, expectedLength, `${type} orders length`);
  };

const initContractsAndAllowance = async accounts => {
  await testHelper.createContracts({
    owner: accounts[0],
    useFakeDex: true, // We need Fake to manipulate order expired in Tick
    tokenPair: {}, // Will add the default base and secondary pair
    ordersForTick: 2,
    maxBlocksForTick: 2,
    minBlocksForTick: 1
  });
  [dex, base, secondary] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary()
  ]);
  dex = testHelper.decorateGetOrderAtIndex(dex);
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
  await testHelper.setBalancesAndAllowances({ accounts, userData });

  insertBuyLimitOrder = props => insertLimitOrder({ accounts, type: 'buy', ...props })();
  insertSellLimitOrder = props => insertLimitOrder({ accounts, type: 'sell', ...props })();
  /**
   * Verifies that the given account a owner of the order placed in correct position
   */
  assertSellAccountOrderSequence = async accountIndexSequence => {
    for (let i = 0; i < accountIndexSequence.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const order = await dex.getSellOrderAtIndex(base.address, secondary.address, i);
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

describe('Match with expired orders tests', function() {
  before(function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, assertBuySellMatchEvents } = testHelper);
  });
  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    // Control case
    describe('GIVEN there are two buy and sell order that fully match', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 });
        await insertSellLimitOrder({ accountIndex: 2 });
      });
      describe('WHEN instructed to match orders', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN buy order-book is empty', assertOrderBookLength({ type: 'buy' }));
        it('AND sell order-book is empty', assertOrderBookLength({ type: 'sell' }));
        it('AND match events are emitted', function() {
          return assertBuySellMatchEvents(txReceipt, { buyOrderId: '1', sellOrderId: '2' });
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    describe('GIVEN there are one expired buy order, and sell order that "fully match"', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 });
        await insertSellLimitOrder({ accountIndex: 2 });
        await dex.editOrder(base.address, secondary.address, '1', true, '1');
      });
      describe('WHEN instructed to match', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it(
          'THEN the buy order is ignored and remains in the order-book',
          assertOrderBookLength({ type: 'buy', expectedLength: 1 })
        );
        it(
          'AND sell order also remains in the order-book as the was no valid order to match with',
          assertOrderBookLength({ type: 'sell', expectedLength: 1 })
        );
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    describe('GIVEN there are two buy & sell order that "fully match" \nAND a third buy expired before', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 });
        await insertSellLimitOrder({ accountIndex: 2 });
        await insertBuyLimitOrder({ accountIndex: 3 });
        await dex.editOrder(base.address, secondary.address, '1', true, '1');
      });
      describe('WHEN instructed to match', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN buy order-book is empty', assertOrderBookLength({ type: 'buy' }));
        it('AND sell order-book is empty', assertOrderBookLength({ type: 'sell' }));
        it('AND match events are emitted', function() {
          return assertBuySellMatchEvents(txReceipt, { buyOrderId: '3', sellOrderId: '2' });
        });
        it('AND the expired Order has been processed', function() {
          return assertExpiredOrderProcessed({ orderId: '1' }, { to: accounts[1] });
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    describe('GIVEN there are two sets of buy & sell order that "fully match" AND a expired sell orders in between', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 });
        await insertBuyLimitOrder({ accountIndex: 1 });
        await insertSellLimitOrder({ accountIndex: 2 }); // Will be expired and processed
        await insertSellLimitOrder({ accountIndex: 3 });
        await insertSellLimitOrder({ accountIndex: 4 }); // Will be expired and processed
        await insertSellLimitOrder({ accountIndex: 5 });
        await insertSellLimitOrder({ accountIndex: 6 }); // Will be expired
        await insertSellLimitOrder({ accountIndex: 1 }); // valid but no matching
        await dex.editOrder(base.address, secondary.address, '3', false, '1');
        await dex.editOrder(base.address, secondary.address, '5', false, '1');
        await dex.editOrder(base.address, secondary.address, '7', false, '1');
      });
      describe('WHEN instructed to match', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN buy order is empty', assertOrderBookLength({ type: 'buy' }));
        it('AND match events are emitted', async function() {
          await assertBuySellMatchEvents(txReceipt, { buyOrderId: '1', sellOrderId: '4' });
          await assertBuySellMatchEvents(txReceipt, { buyOrderId: '2', sellOrderId: '6' });
        });
        it('AND previous expired Order had been processed', async function() {
          await assertExpiredOrderProcessed({ orderId: '3' }, { to: accounts[2] });
          await assertExpiredOrderProcessed({ orderId: '5' }, { to: accounts[4] });
        });
        it('BUT following expired Order had not', function() {
          return assertSellAccountOrderSequence([6, 1]);
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    describe('GIVEN there is a buy that partially matches with two sell orders enclosed by expired ones', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 }); // default amount is 10
        await insertSellLimitOrder({ accountIndex: 2 }); // Will be expired and processed
        await insertSellLimitOrder({ accountIndex: 3, amount: 5 });
        await insertSellLimitOrder({ accountIndex: 4, amount: 4 });
        await insertSellLimitOrder({ accountIndex: 5 }); // Will be expired
        await insertSellLimitOrder({ accountIndex: 6 }); // Will be expired
        await insertSellLimitOrder({ accountIndex: 1, price: 10 }); // Valid but won't match
        await dex.editOrder(base.address, secondary.address, '2', false, '1');
        await dex.editOrder(base.address, secondary.address, '5', false, '1');
        await dex.editOrder(base.address, secondary.address, '6', false, '1');
      });
      describe('WHEN instructed to match', function() {
        before(async function() {
          await assertSellAccountOrderSequence([2, 3, 4, 5, 6, 1]);
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it(
          'THEN the buy order-book has the one order',
          assertOrderBookLength({ type: 'buy', expectedLength: 1 })
        );
        it('AND previous expired Order had been processed', async function() {
          await assertExpiredOrderProcessed({ orderId: '2' }, { to: accounts[2] });
        });
        it('AND unmatched sell orders remain in the order-book along with following expired', function() {
          return assertSellAccountOrderSequence([5, 6, 1]);
        });
      });
    });
  });

  contract('Dex Fake: uses order edit to manipulate expiration', accounts => {
    describe('GIVEN there is a buy that fully matches with two sell orders partially, that are enclosed by expired ones', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await insertBuyLimitOrder({ accountIndex: 1 }); // default amount is 10
        await insertSellLimitOrder({ accountIndex: 2 }); // Will be expired and processed
        await insertSellLimitOrder({ accountIndex: 3, amount: 5 });
        await insertSellLimitOrder({ accountIndex: 4, amount: 6 }); // Partial match
        await insertSellLimitOrder({ accountIndex: 5 }); // Will be expired
        await dex.editOrder(base.address, secondary.address, '2', false, '1');
        await dex.editOrder(base.address, secondary.address, '5', false, '1');
      });
      describe('WHEN instructed to match', function() {
        before(async function() {
          txReceipt = await dex.matchOrders(
            base.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('AND previous expired Order had been processed', async function() {
          await assertExpiredOrderProcessed({ orderId: '2' }, { to: accounts[2] });
        });
        it('AND unmatched sell orders remain in the order-book along with following expired', function() {
          return assertSellAccountOrderSequence([4, 5]);
        });
      });
    });
  });
});
