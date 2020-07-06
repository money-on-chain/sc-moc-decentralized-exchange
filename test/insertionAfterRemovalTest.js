/**
 * RATIONALE:
 * A bug was found where the insertion of a sell order failed.
 * The error thrown was that an error about the order in which the order
 * was not correct despite the fact that the tx sent had not any hint so the issue was
 * how the position was calculated inside the smart contract. This had to do with the
 * fact that the length of the limit(and market) orderbook was wrongly tracked so that
 * when the orderbook was actually empty the length registered a positive length deriving
 * in that a null order (keep in mind null order means price 0) was used as a "first" order.
 * So never a sell order was able to be inserted because an error of
 * "Price doesnt belong at the start" was thrown.
 */
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;
let dex;
let base;
let secondary;

const MARKET_PRICE = 2;

const cancelOrder = ({ account, orderId, orderIdHint }) =>
  dex.cancelSellOrder(base.address, secondary.address, orderId, orderIdHint, {
    from: account
  });
const expireOrder = async ({ account, orderId }) => {
  const noHint = 0;
  await dex.editOrder(base.address, secondary.address, orderId, false, '1', {
    from: account
  });
  return dex.processExpired(base.address, secondary.address, false, orderId, noHint, '1', {
    from: account
  });
};

const matchOrder = async ({ maxPrice, account }) => {
  await dex.insertBuyLimitOrder(
    base.address,
    secondary.address,
    wadify(1 * maxPrice), // buy 1
    pricefy(maxPrice),
    10,
    {
      from: account
    }
  );
  return dex.matchOrders(base.address, secondary.address, 10);
};

const assertOrderBookLength = ({ type, expectedLength = 0 }) =>
  async function() {
    const lengthFn = type === 'buy' ? 'buyOrdersLength' : 'sellOrdersLength';
    const ordersLength = await dex[lengthFn](base.address, secondary.address);
    return testHelper.assertBig(ordersLength, expectedLength, `${type} orders length`);
  };

describe('insert after removal test', function() {
  const initContractsAndAllowance = accounts => async () => {
    testHelper = testHelperBuilder();

    ({ wadify, pricefy, DEFAULT_ACCOUNT_INDEX } = testHelper);

    await testHelper.createContracts({
      owner: accounts[0],
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1,
      tokenPair: {},
      useFakeDex: true
    });
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = testHelper.decorateGetOrderAtIndex(dex);
    await testHelper.setOracleMarketPrice(dex, base.address, secondary.address, MARKET_PRICE);
  };

  contract(
    'insert a limit order given one was cancelled and there is another market order in the ordebook',
    function(accounts) {
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order and a sell limit order which will be cancelled', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.0001),
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.1),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the limit order is cancelled', function() {
          before(async function() {
            return cancelOrder({
              type: 'sell',
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              orderId: 1,
              orderIdHint: 0
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertSellLimitOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(0.001),
              5,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );

  contract(
    'insert a market order given one was cancelled and there is another limit order in the ordebook',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order which will be cancelled and a sell limit order', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.0001),
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.1),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the market order is cancelled', function() {
          before(async function() {
            return cancelOrder({
              type: 'sell',
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              orderId: 2,
              orderIdHint: 0
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertMarketOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(1),
              5,
              false,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );

  contract(
    'insert a limit order given one was expired and there is another market order in the ordebook',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order and a sell limit order which will be expired', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.0001),
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.1),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the limit order is expired', function() {
          before(async function() {
            return expireOrder({
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              orderId: 1
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertSellLimitOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(0.001),
              5,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );

  contract(
    'insert a market order given one was expired and there is another limit order in the ordebook',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order which will be expired and a sell limit order', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.0001),
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(0.1),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the market order is expired', function() {
          before(async function() {
            return expireOrder({
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              orderId: 2,
              orderIdHint: 0
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertMarketOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(1),
              5,
              false,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );

  contract(
    'insert a limit order given one was matched and there is another market order in the ordebook',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order and a sell limit order which will be matched', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1),
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(4 / MARKET_PRICE), // no matcheable
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the limit order is matched', function() {
          before(async function() {
            return matchOrder({
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              maxPrice: 1
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertSellLimitOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(1),
              5,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );

  contract(
    'insert a market order given one was matched and there is another limit order in the ordebook',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN there is a sell market order which will be matched and a sell limit order', function() {
        before(async function() {
          await dex.insertSellLimitOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(4), // no matcheable
            5,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1 / MARKET_PRICE),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN the market order is matched', function() {
          before(async function() {
            return matchOrder({
              account: accounts[DEFAULT_ACCOUNT_INDEX],
              maxPrice: 1
            });
          });

          it('THEN another order can be inserted AND the orderbook length increases ', async function() {
            await dex.insertMarketOrder(
              base.address,
              secondary.address,
              wadify(1),
              pricefy(1),
              5,
              false,
              {
                from: accounts[DEFAULT_ACCOUNT_INDEX]
              }
            );
            assertOrderBookLength({ type: 'sell', expectedLength: 2 });
          });
        });
      });
    }
  );
});
