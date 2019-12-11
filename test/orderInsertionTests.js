const { expect } = require('chai');
const { expectEvent, BN } = require('openzeppelin-test-helpers');

const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;
let pair;

describe('Tests related to the insertion of an order', function() {
  let dex;
  let base;
  let secondary;
  let RATE_PRECISION_BN;
  let DEFAULT_COMMISSION_RATE;
  before(async function() {
    testHelper = testHelperBuilder();
    ({
      wadify,
      pricefy,
      DEFAULT_ACCOUNT_INDEX,
      DEFAULT_COMMISSION_RATE,
      RATE_PRECISION_BN
    } = testHelper);
  });
  const initContractsAndAllowance = async (accounts, commission) => {
    await testHelper.createContracts({
      owner: accounts[0],
      useFakeDex: true, // We need Fake to access orders at position
      tokenPair: {}, // Will add the default base and secondary pair
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1,
      commission
    });
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    pair = [base.address, secondary.address];
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = await testHelper.decorateGetOrderAtIndex(dex);
  };
  contract('Single order insertion', accounts => {
    let insertionBuyReceipt;
    let insertionSellReceipt;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    it('WHEN inserting a buy order', async function() {
      insertionBuyReceipt = await dex.insertBuyOrder(...pair, wadify(10), pricefy(1), 5, {
        from: accounts[DEFAULT_ACCOUNT_INDEX]
      });
    });
    it('THEN the order is inserted', async function() {
      const order = await dex.getBuyOrderAtIndex(...pair, 0);
      expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
      testHelper.assertBigWad(order.exchangeableAmount, 10, 'amount');
      testHelper.assertBigPrice(order.price, 1, 'price');
    });
    it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
      const expectedReservedCommission = wadify(10)
        .mul(new BN(DEFAULT_COMMISSION_RATE))
        .div(RATE_PRECISION_BN);
      const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
      expectEvent.inLogs(insertionBuyReceipt.logs, 'NewOrderInserted', {
        reservedCommission: expectedReservedCommission,
        exchangeableAmount: expectedExchangeableAmount
      });
    });

    it('AND the orderbook length is updated accordingly', async function() {
      testHelper.assertBig(await dex.buyOrdersLength(...pair), 1);
    });
    describe('WHEN inserting a sell order', function() {
      before(async function() {
        insertionSellReceipt = await dex.insertSellOrder(...pair, wadify(10), pricefy(1), 5, {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        });
      });
      it('THEN the order is inserted', async function() {
        const order = await dex.getSellOrderAtIndex(...pair, 0);
        expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
        testHelper.assertBigWad(order.exchangeableAmount, 10, 'amount');
        testHelper.assertBigPrice(order.price, 1, 'price');
      });
      it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
        const expectedReservedCommission = wadify(10)
          .mul(new BN(DEFAULT_COMMISSION_RATE))
          .div(RATE_PRECISION_BN);
        const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
        expectEvent.inLogs(insertionSellReceipt.logs, 'NewOrderInserted', {
          reservedCommission: expectedReservedCommission,
          exchangeableAmount: expectedExchangeableAmount
        });
      });
      it('AND the orderbook length is updated accordingly', async function() {
        testHelper.assertBig(await dex.sellOrdersLength(...pair), 1, 'sellOrdersLength');
      });
    });
  });
  contract('Single order insertion with a commission greater than 0', accounts => {
    let insertionBuyReceipt;
    let insertionSellReceipt;
    let commission;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      commission = { commissionRate: RATE_PRECISION_BN.div(new BN(100)) }; // 1%
      return initContractsAndAllowance(accounts, commission);
    });
    describe('WHEN inserting a buy order', function() {
      before(async function() {
        insertionBuyReceipt = await dex.insertBuyOrder(...pair, wadify(10), pricefy(1), 5, {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        });
      });
      it('THEN the order is inserted', async function() {
        const order = await dex.getBuyOrderAtIndex(...pair, 0);
        expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
        testHelper.assertBigWad(order.exchangeableAmount, 9.9, 'amount');
        testHelper.assertBigPrice(order.price, 1, 'price');
      });
      it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
        const expectedReservedCommission = wadify(10)
          .mul(new BN(commission.commissionRate))
          .div(RATE_PRECISION_BN);
        const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
        expectEvent.inLogs(insertionBuyReceipt.logs, 'NewOrderInserted', {
          reservedCommission: expectedReservedCommission,
          exchangeableAmount: expectedExchangeableAmount
        });
      });

      it('AND the orderbook length is updated accordingly', async function() {
        testHelper.assertBig(await dex.buyOrdersLength(...pair), 1);
      });
      describe('WHEN inserting a sell order', function() {
        before(async function() {
          insertionSellReceipt = await dex.insertSellOrder(...pair, wadify(10), pricefy(1), 5, {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          });
        });
        it('THEN the order is inserted', async function() {
          const order = await dex.getSellOrderAtIndex(...pair, 0);
          expect(order.owner).to.be.equals(
            accounts[DEFAULT_ACCOUNT_INDEX],
            'owner set incorrectly'
          );
          testHelper.assertBigWad(order.exchangeableAmount, 9.9, 'amount');
          testHelper.assertBigPrice(order.price, 1, 'price');
        });
        it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
          const expectedReservedCommission = wadify(10)
            .mul(new BN(commission.commissionRate))
            .div(RATE_PRECISION_BN);
          const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
          expectEvent.inLogs(insertionSellReceipt.logs, 'NewOrderInserted', {
            reservedCommission: expectedReservedCommission,
            exchangeableAmount: expectedExchangeableAmount
          });
        });

        it('AND the orderbook length is updated accordingly', async function() {
          testHelper.assertBig(await dex.sellOrdersLength(...pair), 1, 'sellOrdersLength');
        });
      });
    });
  });
  contract('Ordered insertion of 10 orders', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten sell orders are inserted in order', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertSellOrder(...pair, wadify(10), pricefy(10 - i), 5, {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          });
        }
      });
      it('THEN they end up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getSellOrderAtIndex(...pair, it);
            testHelper.assertBigPrice(order.price, it + 1, 'orders are not ordered, order price');
          })
        );
      });
    });
    describe('GIVEN ten buy orders are inserted in order', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertBuyOrder(...pair, wadify(10), pricefy(1 + i), 5, {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          });
        }
      });
      it('THEN they end up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getBuyOrderAtIndex(...pair, it);
            testHelper.assertBigPrice(order.price, 10 - it, 'orders are not ordered, order price');
          })
        );
      });
    });
  });
});
