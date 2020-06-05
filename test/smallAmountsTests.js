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

const testHelper = testHelperBuilder();
const { wadify, pricefy, DEFAULT_ACCOUNT_INDEX } = testHelper;

describe('small amounts test', function() {
  let dex;
  let base;
  let secondary;

  const initContractsAndAllowance = accounts => async () => {
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
      testHelper.assertBig(ordersLength, 1);
    });

    it('AND the buy orderbook has a length of 0', async function() {
      const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
      testHelper.assertBig(ordersLength, 0);
    });

    it('AND the order is still on the orderbook with the discounted amount', async function() {
      const order = await dex.getSellOrderAtIndex(base.address, secondary.address, 0);
      testHelper.assertBig(order.id, 1);
      testHelper.assertBigPrice(order.price, 0.0001);
      testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
      testHelper.assertBig(order.next, 0);
      testHelper.assertBigWad(order.exchangeableAmount, 1);
    });
  });

  contract('a very small buy market order against a normal sell market order', function(accounts) {
    before(initContractsAndAllowance(accounts));
    let tx;
    // Assumes a market price of 15 base/secondary
    describe('GIVEN there is a normal sell market order', function() {
      before(async function() {
        await dex.insertMarketOrder(
          base.address,
          secondary.address,
          wadify(15), // Sells 15 secondary tokens
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
            wadify(0.00015), // If price keeps at 15, wants to buy 0.00001
            pricefy(1),
            5,
            true,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe.skip('WHEN instructed to match orders', function() {
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

          it('AND the sell orderbook has a length of 1', async function() {
            const ordersLength = await dex.sellOrdersLength(base.address, secondary.address);
            testHelper.assertBig(ordersLength, 1);
          });

          it('AND the buy orderbook has a length of 0', async function() {
            const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
            testHelper.assertBig(ordersLength, 0);
          });

          it('AND the order is still on the orderbook', async function() {
            const order = await dex.getSellOrderAtIndex(base.address, secondary.address, 0);
            testHelper.assertBig(order.id, 1);
            testHelper.assertBigPrice(order.priceMultiplier, 1);
            testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
            testHelper.assertBig(order.next, 0);
            testHelper.assertBigWad(order.exchangeableAmount, 14.9999);
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
          wadify(6), // Wants to buy 3
          pricefy(2),
          5,
          {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          }
        );
      });

      describe('AND there is a very small sell market order', function() {
        before(async function() {
          // Assumes a market price of 15 base/secondary

          await dex.insertMarketOrder(
            base.address,
            secondary.address,
            wadify(0.0001), // Wants to sell 0.0001
            pricefy(30 / 15),
            5,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        });
        describe.skip('WHEN instructed to match orders', function() {
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
            testHelper.assertBig(ordersLength, 0);
          });

          it('AND the buy orderbook has a length of 1', async function() {
            const ordersLength = await dex.buyOrdersLength(base.address, secondary.address);
            testHelper.assertBig(ordersLength, 1);
          });

          it('AND the buy order is still on the orderbook', async function() {
            const order = await dex.getBuyOrderAtIndex(base.address, secondary.address, 0);
            testHelper.assertBig(order.id, 1);
            testHelper.assertBigPrice(order.priceMultiplier, 30 / 15);
            testHelper.assertAddresses(order.owner, accounts[DEFAULT_ACCOUNT_INDEX]);
            testHelper.assertBig(order.next, 0);
            testHelper.assertBigWad(order.exchangeableAmount, 2.999); // Half of its consumed
          });
        });
      });
    });
  });
});
