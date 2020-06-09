const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

const ERROR_MSG_POSITION_TOO_LOW = 'Order should go after';
const ERROR_MSG_NOT_BELONGING_TO_START = 'Price doesnt belong to start';
const ERROR_MSG_POSITION_TOO_HIGH = 'Order should go before';
const ERROR_MSG_PREVIOUS_ORDER_DOESNT_EXIST = 'PreviousOrder doesnt exist';

describe('specific insertion tests', function() {
  let dex;
  let wadify;
  let pricefy;
  let DEFAULT_ACCOUNT_INDEX;
  let testHelper;
  let from;
  let pair;
  const lifespan = 5;
  const initContractsAndAllowance = accounts => async () => {
    testHelper = testHelperBuilder();
    await testHelper.createContracts({
      owner: accounts[0],
      useFakeDex: true, // We need Fake to access orders at position
      tokenPair: {}, // Will add the default base and secondary pair
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1
    });
    ({ wadify, pricefy, DEFAULT_ACCOUNT_INDEX } = testHelper);
    let base;
    let secondary;
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = await testHelper.decorateGetOrderAtIndex(dex);
    pair = [base.address, secondary.address];
    from = accounts[DEFAULT_ACCOUNT_INDEX];
  };

  contract('insertion of 1 sell order in order 0 in an empty orderbook', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN an empty orderbook', function() {
      describe('WHEN inserting an order first in the orderbook', function() {
        before(function() {
          return dex.insertBuyLimitOrderAfter(...pair, wadify(1), pricefy(1), lifespan, 0, {
            from
          });
        });
        it('THEN it end up ordered', async function() {
          const order = await dex.getBuyOrderAtIndex(...pair, 0);
          await testHelper.assertBigWad(order.exchangeableAmount, 1, 'order amount');
          return testHelper.assertBigPrice(order.price, 1, 'order price');
        });
      });
    });
  });

  contract('Dex: InsertOrderAfter', function(accounts) {
    describe('GIVEN 2 sell orders', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(10), lifespan, { from });
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), lifespan, { from });
      });
      describe('WHEN inserting an order, between 2 existing ones', function() {
        it('THEN it end up ordered', async function() {
          await dex.insertSellLimitOrderAfter(...pair, wadify(1), pricefy(5), lifespan, 2, {
            from
          });
          const order = await dex.getSellOrderAtIndex(...pair, 1);
          testHelper.assertBigWad(order.exchangeableAmount, 1, 'order amount');
          testHelper.assertBigPrice(order.price, 5, 'order price');
        });
      });
      describe('WHEN inserting order first in the orderbook', function() {
        before(async function() {
          await dex.insertSellLimitOrderAfter(...pair, wadify(1), pricefy(0.5), lifespan, 0, {
            from
          });
        });
        it('THEN it end up ordered', async function() {
          const order = await dex.getSellOrderAtIndex(...pair, 0);
          testHelper.assertBigWad(order.exchangeableAmount, 1, 'order amount');
          testHelper.assertBigPrice(order.price, 0.5, 'order price');
        });
      });
      it('WHEN trying to insert one before a more competitive one, THEN it reverts', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(...pair, wadify(10), pricefy(15), lifespan, 2, { from }),
          ERROR_MSG_POSITION_TOO_LOW
        );
      });
      it('WHEN trying to insert an order first than 1 more competitive ones(being at the beginning), THEN it reverts', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(...pair, wadify(10), pricefy(10), lifespan, 0, { from }),
          ERROR_MSG_NOT_BELONGING_TO_START
        );
      });
      it('WHEN trying to insert an order with a reference to a non-existent order, THEN it reverts', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(...pair, wadify(10), pricefy(10), lifespan, 8, { from }),
          ERROR_MSG_PREVIOUS_ORDER_DOESNT_EXIST
        );
      });
    });
  });

  contract('insertion of 1 sell order after an existing one, but should be before', function(
    accounts
  ) {
    describe('GIVEN 1 sell order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(10), lifespan, { from });
      });
      it('WHEN trying to insert one after a less competitive one, THEN it reverts', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(...pair, wadify(9), pricefy(9), lifespan, 1, { from }),
          ERROR_MSG_POSITION_TOO_HIGH
        );
      });
    });
  });

  contract('insertion of 1 buy order last', function(accounts) {
    describe('GIVEN 1 buy order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertBuyLimitOrder(...pair, wadify(10), pricefy(5), lifespan, { from });
      });
      describe('WHEN inserting order with the same price as the existing one in the orderbook', function() {
        before(async function() {
          await dex.insertBuyLimitOrderAfter(...pair, wadify(1), pricefy(5), lifespan, 1, { from });
        });
        it('THEN it end up after the existing one', async function() {
          const order = await dex.getBuyOrderAtIndex(...pair, 1);
          testHelper.assertBigWad(order.exchangeableAmount, 1, 'order amount');
          testHelper.assertBigPrice(order.price, 5, 'order price');
        });
      });
    });
  });

  contract('insertion of 1 sell order between 2 existing ones with the same price', function(
    accounts
  ) {
    describe('GIVEN 2 sell orders with price 1', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), lifespan, { from });
        await dex.insertSellLimitOrder(...pair, wadify(10), pricefy(1), lifespan, { from });
      });
      it('WHEN trying to insert one between 2 orders with the same price, THEN it reverts', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(...pair, wadify(10), pricefy(1), lifespan, 1, { from }),
          ERROR_MSG_POSITION_TOO_LOW
        );
      });
    });
  });
});
