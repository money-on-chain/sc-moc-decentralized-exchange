const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

const ERROR_MSG_POSITION_TOO_LOW = 'Market Order should go after';
const ERROR_MSG_POSITION_TOO_HIGH = 'Market Order should go before';
const ERROR_MSG_PREVIOUS_ORDER_DOESNT_EXIST = 'PreviousOrder doesnt exist';
const ERROR_MSG_MULTIPLY_FACTOR_DOESNT_BELONG_TO_START = 'Multiply factor doesnt belong to start';

describe('specific market order insertion tests', function() {
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

  contract('insertion of 1 buy order in order 0 in an empty orderbook', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN an empty buy orderbook', function() {
      describe('WHEN inserting a buy market order first in the orderbook', function() {
        before(function() {
          return dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(2),
            pricefy(1.1),
            0,
            lifespan,
            true,
            {
              from
            }
          );
        });
        it('THEN the buy orderbook length is updated accordingly', async function() {
          testHelper.assertBig(
            await dex.buyOrdersLength(...pair),
            1,
            'buy market orders length incorrect'
          );
        });
        it('THEN it ends up ordered', async function() {
          const order = await dex.getBuyOrderAtIndex(...pair, 0);
          testHelper.assertBigWad(order.exchangeableAmount, 2, 'exchangeable amount');
          testHelper.assertBigPrice(order.multiplyFactor, 1.1, 'multiply factor');
        });
        it('AND the orderbook has 1 order', async function() {
          testHelper.assertBig(await dex.buyOrdersLength(...pair), 1, 'buyOrdersLength');
        });
      });
    });
  });

  contract('Dex: InsertOrderAfter', function(accounts) {
    describe('GIVEN 2 buy market orders and 1 sell order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertMarketOrder(pair[0], pair[1], wadify(5), pricefy(0.8), lifespan, true, {
          from
        });
        await dex.insertMarketOrder(pair[0], pair[1], wadify(4), pricefy(0.9), lifespan, true, {
          from
        });
        await dex.insertMarketOrder(pair[0], pair[1], wadify(4), pricefy(0.9), lifespan, false, {
          // order ID: 3
          from
        });
      });
      it('THEN the first market order should be of 5 tokens', async function() {
        const order = await dex.getBuyOrderAtIndex(...pair, 0);
        testHelper.assertBigWad(order.exchangeableAmount, 4, 'exchangeable amount');
        testHelper.assertBigPrice(order.multiplyFactor, 0.9, 'multiply factor');
      });
      it('THEN the first market order should be of 4 tokens', async function() {
        const order = await dex.getBuyOrderAtIndex(...pair, 1);
        testHelper.assertBigWad(order.exchangeableAmount, 5, 'exchangeable amount');
        testHelper.assertBigPrice(order.multiplyFactor, 0.8, 'multiply factor');
      });
      describe('WHEN inserting a buy market order first in the orderbook', function() {
        before(async function() {
          await dex.insertMarketOrder(pair[0], pair[1], wadify(3), pricefy(0.95), lifespan, true, {
            from
          });
        });
        it('THEN it end up ordered', async function() {
          const order = await dex.getBuyOrderAtIndex(...pair, 0);
          testHelper.assertBigWad(order.exchangeableAmount, 3, 'exchangeable amount');
          testHelper.assertBigPrice(order.multiplyFactor, 0.95, 'multiply factor');
        });
      });
      it('WHEN trying to insert one before a more competitive one, THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(pair[0], pair[1], wadify(3), pricefy(0.6), 2, lifespan, true, {
            from
          }),
          ERROR_MSG_POSITION_TOO_LOW
        );
      });
      it('WHEN trying to insert an order first than 1 more competitive ones(being at the beginning), THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(pair[0], pair[1], wadify(4), pricefy(0.6), 0, lifespan, true, {
            from
          }),
          ERROR_MSG_MULTIPLY_FACTOR_DOESNT_BELONG_TO_START
        );
      });
      it('WHEN trying to insert an order with a reference to a non-existent order, THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(4),
            pricefy(0.6),
            100,
            lifespan,
            true,
            {
              from
            }
          ),
          ERROR_MSG_PREVIOUS_ORDER_DOESNT_EXIST
        );
      });
      it('WHEN trying to insert a buy order with a reference to a sell order, THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(pair[0], pair[1], wadify(4), pricefy(0.6), 3, lifespan, true, {
            from
          }),
          ERROR_MSG_PREVIOUS_ORDER_DOESNT_EXIST
        );
      });
    });
  });
  contract('insertion of 1 sell market order after an existing one, but should be before', function(
    accounts
  ) {
    describe('GIVEN 1 sell order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertMarketOrder(pair[0], pair[1], wadify(2), pricefy(1.2), lifespan, false, {
          from
        });
      });
      it('WHEN trying to insert one after a less competitive one, THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(2),
            pricefy(1.1),
            1,
            lifespan,
            false,
            {
              from
            }
          ),
          ERROR_MSG_POSITION_TOO_HIGH
        );
      });
    });
  });

  contract('insertion of 1 sell market order last', function(accounts) {
    describe('GIVEN 1 sell market order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertMarketOrder(pair[0], pair[1], wadify(2), pricefy(1.2), lifespan, false, {
          from
        });
      });

      describe('WHEN inserting order with the same multiply factor as the existing one in the orderbook', function() {
        before(async function() {
          await dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(5),
            pricefy(1.2),
            1,
            lifespan,
            false,
            {
              from
            }
          );
        });
        it('THEN it end up after the existing one', async function() {
          const order = await dex.getSellOrderAtIndex(...pair, 1);
          testHelper.assertBigWad(order.exchangeableAmount, 5, 'exchengeable amount');
          testHelper.assertBigPrice(order.multiplyFactor, 1.2, 'multiply factor');
        });
      });
    });
  });

  contract('insertion of 1 sell market order between 2 existing ones with the same price', function(
    accounts
  ) {
    describe('GIVEN 2 sell market orders with multiplyFactor 1.5', function() {
      before(async function() {
        await initContractsAndAllowance(accounts)();
        await dex.insertMarketOrderAfter(
          pair[0],
          pair[1],
          wadify(5),
          pricefy(1.5),
          0,
          lifespan,
          false,
          {
            from
          }
        );
        await dex.insertMarketOrderAfter(
          pair[0],
          pair[1],
          wadify(6),
          pricefy(1.5),
          1,
          lifespan,
          false,
          {
            from
          }
        );
      });
      it('THEN the first sell order should be with 5 Exchangeable Amount', async function() {
        const order = await dex.getSellOrderAtIndex(...pair, 0);
        await testHelper.assertBigWad(order.exchangeableAmount, 5, 'exchangeable amount');
        return testHelper.assertBigPrice(order.multiplyFactor, 1.5, 'multiply factor');
      });
      it('THEN the second sell order should be with 5 Exchangeable Amount', async function() {
        const order = await dex.getSellOrderAtIndex(...pair, 1);
        await testHelper.assertBigWad(order.exchangeableAmount, 6, 'exchengeable amount');
        return testHelper.assertBigPrice(order.multiplyFactor, 1.5, 'multiply factor');
      });
      it('WHEN trying to insert one between 2 orders with the same price, THEN it reverts', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(6),
            pricefy(1.5),
            1,
            lifespan,
            false,
            {
              from
            }
          ),
          ERROR_MSG_POSITION_TOO_LOW
        );
      });
    });
  });
});
