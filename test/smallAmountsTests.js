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
      tokenPair: {}
    });
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
  };

  contract('a very small buy order against a normal sell order', function(accounts) {
    before(initContractsAndAllowance(accounts));
    let tx;
    it('GIVEN there is a normal sell order', async function() {
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
    it('AND there is a very small buy order', async function() {
      await dex.insertBuyLimitOrder(
        base.address,
        secondary.address,
        wadify(0.001),
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
  });
});
