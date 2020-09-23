const { expectEvent, expectRevert } = require('openzeppelin-test-helpers');

const { BN } = web3.utils;
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let executeBatched;
let dex;
let base;
let secondary;
let offChainIdTracker = 0;

const orderTracker = [];
orderTracker.clear = function() {
  this.length = 0;
  offChainIdTracker = 0;
};
orderTracker.insert = function(props) {
  this.push(Object.assign({}, props, { id: ++offChainIdTracker }));
};
orderTracker.update = function(id, data) {
  const index = this.findIndex(it => it.id === id);
  this[index] = Object.assign(this[index], data);
};
orderTracker.getByOrderId = function(id) {
  return this.find(it => it.id === id);
};

const insertMarketOrder = ({ type, accounts, accountIndex, ...props }) =>
  function() {
    const { amount, price, lifespan } = Object.assign(
      {},
      { amount: wadify(10), price: pricefy(1), lifespan: 5 },
      props
    );
    const from = props.from || accounts[accountIndex];
    return dex
      .insertMarketOrder(base.address, secondary.address, amount, price, lifespan, type === 'buy', {
        from
      })
      .then(insertTx => orderTracker.insert({ type, insertTx, amount, price, owner: from }));
  };

const cancelOrder = ({ type, accounts, accountIndex, orderId, prevHint, ...props }) =>
  async function() {
    const bigOrderId = new BN(orderId || offChainIdTracker);
    const cancelFn = type === 'buy' ? 'cancelBuyOrder' : 'cancelSellOrder';
    const from = accounts[accountIndex];
    return dex[cancelFn](base.address, secondary.address, bigOrderId, prevHint, {
      from,
      ...props
    }).then(cancelTx => orderTracker.update(orderId || offChainIdTracker, { cancelTx }));
  };

const assertOrderBookLength = ({ type, expectedLength }) =>
  async function() {
    const lengthFn = type === 'buy' ? 'buyOrdersLength' : 'sellOrdersLength';
    const ordersLength = await dex[lengthFn](base.address, secondary.address);
    return testHelper.assertBig(ordersLength, expectedLength || 0, `${type} orders length`);
  };

const assertBalance = ({ type, account, expectedBalance }) =>
  async function() {
    const token = await (type === 'buy' ? testHelper.getBase() : testHelper.getSecondary());
    await testHelper.assertBigWad(
      token.balanceOf(account),
      expectedBalance || 0,
      `incorrect account balance (${type})`
    );
  };

const assertDexBalance = props =>
  async function() {
    assertBalance({ ...props, account: dex.address })();
  };

const assertCancelEvent = ({ orderId }) =>
  function() {
    const lastOrder = orderTracker.getByOrderId(orderId);
    const expectedData = {
      id: lastOrder.id.toString(),
      sender: lastOrder.owner,
      returnedAmount: lastOrder.amount,
      isBuy: lastOrder.type === 'buy'
    };
    expectEvent.inLogs(lastOrder.cancelTx.logs, 'OrderCancelled', expectedData);
  };

const assertTransferEvent = ({ accounts, accountIndex, getTxFn }) =>
  async function() {
    const expectedData = {
      to: accounts[accountIndex],
      value: wadify(10)
    };
    expectEvent.inTransaction(
      getTxFn(),
      testHelper.getBaseToken(), // Just needs the ERC20 abi
      'Transfer',
      expectedData
    );
  };

const assertUserReceives = ({ accounts, accountIndex, orderId, ...props }) => {
  const assertUserBalance = assertBalance({
    ...props,
    account: accounts[accountIndex]
  });
  const getTxFn = () => orderTracker.getByOrderId(orderId).cancelTx.tx;
  const assertTransfer = assertTransferEvent({ ...props, accounts, accountIndex, getTxFn });
  return async function() {
    await assertUserBalance();
    await assertTransfer();
  };
};

const initContractsAndAllowance = accounts => async () => {
  // with this, the contract charge no commission for the cancellation
  await testHelper.createContracts({
    owner: accounts[0],
    tokenPair: {} // Will add the default base and secondary pair
  });

  [dex, base, secondary] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary()
  ]);
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
  orderTracker.clear();
};

describe('Market Order cancel tests', function() {
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, executeBatched } = testHelper);
  });
  const getScenario = props =>
    Object.assign({}, { type: 'buy', accountIndex: 1, orderId: 1, prevHint: new BN(0) }, props);

  contract('Dex: simple cancel', accounts => {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    [
      getScenario({ type: 'buy', accounts }),
      getScenario({ type: 'sell', accounts, orderId: 2 })
    ].forEach(scenario => {
      describe(`GIVEN there is a single ${scenario.type} order`, function() {
        before(insertMarketOrder(scenario));
        describe('WHEN the owner cancels it', function() {
          before(cancelOrder(scenario));
          it(`THEN ${scenario.type} order-book is zero`, assertOrderBookLength(scenario));
          it('AND dex balance is reduced by the order amount', assertDexBalance(scenario));
          it(
            'AND user receives the corresponding amount',
            assertUserReceives({ ...scenario, expectedBalance: 100 })
          );
          it('AND a cancel event is emitted', assertCancelEvent(scenario));
        });
      });
    });
  });

  // As orders are kept on a linked list structure, it's important to cover all position scenarios
  ['first', 'middle', 'last'].forEach((position, index) => {
    contract(`Dex: cancel ${position} order of order-book`, accounts => {
      const orderId = [1, 3, 5][index]; // first, middle, last
      const scenario = getScenario({ accounts, orderId, accountIndex: orderId });
      const insertFns = [1, 2, 3, 4, 5].map(accountIndex =>
        insertMarketOrder(Object.assign({}, scenario, { accountIndex }))
      );
      describe('GIVEN there is are many buy orders', function() {
        before(async function() {
          await initContractsAndAllowance(accounts)();
          for (let i = 0; i < insertFns.length; i++)
            // eslint-disable-next-line no-await-in-loop
            await insertFns[i](); // ordered insert to guarantee orderId correlation
        });
        describe(`WHEN the owner cancels the ${position} one`, function() {
          before(cancelOrder(scenario));
          it(
            'THEN buy order-book is reduced by one',
            assertOrderBookLength({
              ...scenario,
              expectedLength: insertFns.length - 1
            })
          );
          it('AND a cancel event is emitted', assertCancelEvent(scenario));
          it(
            'AND dex balance is reduced by the order amount',
            assertDexBalance({
              ...scenario,
              expectedBalance: 10 * (insertFns.length - 1)
            })
          );
          it(
            'AND user receives the corresponding amount',
            assertUserReceives({ ...scenario, expectedBalance: 100 })
          );
          it('AND a new buy order can be placed', async function() {
            await insertMarketOrder({ type: 'buy', accounts, accountIndex: 6 })();
            await assertBalance({
              type: 'buy',
              account: accounts[6],
              expectedBalance: 90
            })();
          });
        });
      });
    });
  });

  contract('Dex: un-authorized order canceling', accounts => {
    const scenario = getScenario({ accounts, accountIndex: 1 });
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN there is an order', function() {
      before(insertMarketOrder(scenario));
      describe('WHEN none owner user cancels it', function() {
        it('THEN transaction reverts', function() {
          const unAuthorized = Object.assign({}, scenario, { accountIndex: 2 });
          return expectRevert(cancelOrder(unAuthorized)(), 'Not order owner');
        });
      });
    });
  });

  /**
   * This is not an actual block gas limit out of gas test, but an assertion on the fact
   * that proving a convenient "previous Order Id" saves gas, and could prevent a out of gas
   * situation.
   */
  contract('Dex: cancel using optimized hint', accounts => {
    describe('GIVEN there are hundreds of buy orders', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        const amount = wadify(0.1);
        const doInsert = insertMarketOrder(getScenario({ accounts, amount }));
        // Inserts many orders to inflate the order-book, no need for order as it uses same account
        return executeBatched([...Array(100)].map(() => doInsert));
      });
      describe('WHEN the owner cancels the last one', function() {
        describe('AND he provides no hint', function() {
          it('THEN the transactions reverts for out of gas', function() {
            const cancel = cancelOrder(getScenario({ accounts, orderId: 100, gas: 200000 }));
            // Out of gas are replaced for a revert in the ZeppelinOS proxy pattern
            return expectRevert.unspecified(cancel());
          });
        });
        describe('AND he provides a convenient hint', function() {
          it('THEN the transactions is processed', async function() {
            const orderId = 100;
            const prevHint = new BN(99);
            const cancel = cancelOrder(getScenario({ accounts, orderId, prevHint, gas: 200000 }));
            await cancel();
            const cancelledOrder = orderTracker.getByOrderId(orderId);
            return expectEvent.inLogs(cancelledOrder.cancelTx.logs, 'OrderCancelled', {
              id: '100'
            });
          });
        });
      });
      describe('WHEN the owner cancels the middle one', function() {
        describe('AND he provides an incorrect hint', function() {
          it('THEN the transactions reverts', function() {
            const prevHint = new BN(70);
            const orderId = 50;
            const cancelReceipt = cancelOrder(getScenario({ accounts, orderId, prevHint }));
            return expectRevert(cancelReceipt(), 'Previous order not found');
          });
        });
      });
    });
  });
});
