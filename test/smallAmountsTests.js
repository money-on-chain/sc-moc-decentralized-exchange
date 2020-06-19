/* eslint-disable mocha/no-setup-in-describe */
/* eslint-disable mocha/no-async-describe */

/**
 * RATIONALE:
 * once upon a time, there was a nasty nasty bug which
 * consisted on the rounding errors in the currency conversion
 * causing to subtract 0 to the matched orders, and since
 * we chose which order to consider fully matched and later remove
 * from the orderbook based on its amount being 0, there was no removal
 * and the matching continued in an infinite loop until an out of gas
 * error ocurred.
 */
const { expect } = require('chai');

const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;

const MARKET_PRICE = 2;

describe('small amounts test', function() {
  let dex;
  let base;
  let secondary;

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

  contract('a very small buy limit order against a normal sell limit order', function(accounts) {
    before(initContractsAndAllowance(accounts));
    let tx;
    it('GIVEN there is a normal sell limit order', async function() {
      await dex.insertSellLimitOrder(
        base.address,
        secondary.address,
        wadify(2),
        pricefy(0.0001),
        5,
        {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        }
      );
    });
    it('AND there is a very small limit buy order', async function() {
      await dex.insertBuyLimitOrder(
        base.address,
        secondary.address,
        wadify(0.001), // wants to buy 1 secondary token
        pricefy(0.001),
        5,
        {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        }
      );
    });
    it('WHEN instructed to match orders', async function() {
      tx = await dex.matchOrders(
        base.address,
        secondary.address,
        testHelper.DEFAULT_STEPS_FOR_MATCHING
      );
    });
    it('THEN there is exactly one BuyerMatch event', function() {
      expect(tx.logs.filter(it => it.event === 'BuyerMatch')).to.have.lengthOf(1);
    });
    it('AND there is exactly one sellerMatch event', function() {
      expect(tx.logs.filter(it => it.event === 'SellerMatch')).to.have.lengthOf(1);
    });
    it('AND the sell orderbook has a length of 1', async function() {
      const ordersLength = await dex.sellOrdersLength(base.address, secondary.address);
      return testHelper.assertBig(ordersLength, 1);
    });

    it('AND the buy orderbook has a length of 0', async function() {
      const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
      return testHelper.assertBig(ordersLength, 0);
    });

    it('AND the order is still on the orderbook with the discounted amount', async function() {
      const order = await dex.getSellOrderAtIndex(base.address, secondary.address, 0);
      await testHelper.assertBig(order.id, 1);
      await testHelper.assertBigPrice(order.price, 0.0001);
      await testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
      await testHelper.assertBig(order.next, 0);
      return testHelper.assertBigWad(order.exchangeableAmount, 1);
    });
  });

  contract('a very small buy market order against a normal sell market order', function(accounts) {
    before(initContractsAndAllowance(accounts));
    let tx;
    // Assumes a market price of MARKET_PRICE base/secondary
    describe('GIVEN there is a normal sell market order', function() {
      before(async function() {
        await dex.insertMarketOrder(
          base.address,
          secondary.address,
          wadify(MARKET_PRICE), // Sells MARKET_PRICE secondary tokens
          pricefy(1),
          5,
          false,
          {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          }
        );
      });

      describe('AND there is a very small buy market order', function() {
        before(async function() {
          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(0.0001 * MARKET_PRICE), // If price keeps at MARKET_PRICE, wants to buy 0.00001
            pricefy(1),
            5,
            true,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN instructed to match orders', function() {
          before(async function() {
            await testHelper.setOracleMarketPrice(dex, base.address, secondary.address, MARKET_PRICE);
            tx = await dex.matchOrders(
              base.address,
              secondary.address,
              testHelper.DEFAULT_STEPS_FOR_MATCHING
            );
          });
          it('THEN there is exactly one BuyerMatch event', function() {
            expect(tx.logs.filter(it => it.event === 'BuyerMatch')).to.have.lengthOf(1);
          });
          it('AND there is exactly one sellerMatch event', function() {
            expect(tx.logs.filter(it => it.event === 'SellerMatch')).to.have.lengthOf(1);
          });

          it('AND the sell orderbook has a length of 1', async function() {
            const ordersLength = await dex.sellOrdersLength(base.address, secondary.address);
            return testHelper.assertBig(ordersLength, 1);
          });

          it('AND the buy orderbook has a length of 0', async function() {
            const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
            return testHelper.assertBig(ordersLength, 0);
          });

          it('AND the order is still on the orderbook', async function() {
            const order = await dex.getSellOrderAtIndex(base.address, secondary.address, 0);
            await testHelper.assertBig(order.id, 1);
            await testHelper.assertBigPrice(order.multiplyFactor, 1);
            await testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
            await testHelper.assertBig(order.next, 0);
            return testHelper.assertBigWad(order.exchangeableAmount, 1.9999);
          });
        });
      });
    });
  });

  contract('a very small sell market order against a normal buy limit order', function(accounts) {
    before(initContractsAndAllowance(accounts));
    let tx;
    describe('GIVEN there is a normal buy limit order', function() {
      before(async function() {
        await dex.insertBuyLimitOrder(
          base.address,
          secondary.address,
          wadify(3 * MARKET_PRICE), // Wants to buy 3
          pricefy(MARKET_PRICE),
          5,
          {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          }
        );
      });

      describe('AND there is a very small sell market order', function() {
        before(async function() {
          // Assumes a market price of MARKET_PRICE base/secondary

          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(0.0001), // Wants to sell 0.0001
            pricefy(1),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe('WHEN instructed to match orders', function() {
          before(async function() {
            tx = await dex.matchOrders(
              base.address,
              secondary.address,
              testHelper.DEFAULT_STEPS_FOR_MATCHING
            );
          });
          it('THEN there is exactly one BuyerMatch event', function() {
            expect(tx.logs.filter(it => it.event === 'BuyerMatch')).to.have.lengthOf(1);
          });
          it('AND there is exactly one sellerMatch event', function() {
            expect(tx.logs.filter(it => it.event === 'SellerMatch')).to.have.lengthOf(1);
          });

          it('AND the sell orderbook has a length of 0', async function() {
            const ordersLength = await dex.sellOrdersLength(base.address, secondary.address);
            return testHelper.assertBig(ordersLength, 0);
          });

          it('AND the buy orderbook has a length of 1', async function() {
            const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
            return testHelper.assertBig(ordersLength, 1);
          });

          it('AND the buy order is still on the orderbook', async function() {
            const order = await dex.getBuyOrderAtIndex(base.address, secondary.address, 0);
            await testHelper.assertBig(order.id, 1);
            await testHelper.assertBigPrice(order.price, MARKET_PRICE);
            await testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
            await testHelper.assertBig(order.next, 0);
            return testHelper.assertBigWad(order.exchangeableAmount, (3 - 0.0001) * MARKET_PRICE);
          });
        });
      });
    });
  });
});
