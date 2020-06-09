const { expect } = require('chai');
const { expectEvent, BN } = require('openzeppelin-test-helpers');

const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;
let pair;
const DEFAULT_TOKEN_PRICE = 1;

describe('Tests related to the insertion of a market order', function() {
  let dex;
  let base;
  let secondary;
  let RATE_PRECISION_BN;
  let DEFAULT_COMMISSION_RATE;
  const lifespan = 5;
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
  contract('Single market order insertion at start', accounts => {
    let insertionBuyReceipt;
    let insertionSellReceipt;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    it('WHEN inserting a buy market order at start', async function() {
      insertionBuyReceipt = await dex.insertMarketOrder(
        pair[0],
        pair[1],
        wadify(10),
        pricefy(0.9),
        lifespan,
        true,
        {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        }
      );
    });
    it('THEN the buy market order is inserted', async function() {
      const order = await dex.getBuyOrderAtIndex(...pair, 0);
      expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
      await testHelper.assertBigWad(order.exchangeableAmount, 10, 'amount');
      return testHelper.assertBigPrice(order.multiplyFactor, 0.9, 'multiplyFactor');
    });
    it('AND the insertion event emits the correct reserved commission and exchangeableAmount', async function() {
      const expectedReservedCommission = wadify(10 * 0.9 * DEFAULT_TOKEN_PRICE)
        .mul(new BN(DEFAULT_COMMISSION_RATE))
        .div(RATE_PRECISION_BN);
      const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
      expectEvent.inLogs(insertionBuyReceipt.logs, 'NewOrderInserted', {
        reservedCommission: expectedReservedCommission,
        exchangeableAmount: expectedExchangeableAmount,
        orderType: testHelper.orderTypes.MARKET_ORDER
      });
    });
    it('AND the buy orderbook length is updated accordingly', async function() {
      return testHelper.assertBig(await dex.buyOrdersLength(...pair), 1);
    });

    describe('WHEN inserting a sell market order at start', function() {
      before(async function() {
        insertionSellReceipt = await dex.insertMarketOrder(
          pair[0],
          pair[1],
          wadify(8),
          pricefy(1.3),
          lifespan,
          false,
          {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          }
        );
      });
      it('THEN the market order is inserted at start', async function() {
        const order = await dex.getSellOrderAtIndex(...pair, 0);
        expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
        await testHelper.assertBigWad(order.exchangeableAmount, 8, 'exchangeableAmount');
        return testHelper.assertBigPrice(order.multiplyFactor, 1.3, 'multiplyFactor');
      });
      it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
        const expectedReservedCommission = wadify(8 * 1.3 * DEFAULT_TOKEN_PRICE)
          .mul(new BN(DEFAULT_COMMISSION_RATE))
          .div(RATE_PRECISION_BN);
        const expectedExchangeableAmount = wadify(8);
        expectEvent.inLogs(insertionSellReceipt.logs, 'NewOrderInserted', {
          reservedCommission: expectedReservedCommission,
          exchangeableAmount: expectedExchangeableAmount
        });
      });
      it('AND the sell orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(await dex.sellOrdersLength(...pair), 1, 'sellOrdersLength');
      });
    });
  });
  contract('Single market order insertion', accounts => {
    let insertionBuyReceipt;
    let insertionSellReceipt;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    it('WHEN inserting a buy market order', async function() {
      insertionBuyReceipt = await dex.insertMarketOrderAfter(
        pair[0],
        pair[1],
        wadify(10),
        pricefy(0.9),
        0,
        lifespan,
        true,
        {
          from: accounts[DEFAULT_ACCOUNT_INDEX]
        }
      );
    });
    it('THEN the order is inserted', async function() {
      const order = await dex.getBuyOrderAtIndex(...pair, 0);
      expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
      await testHelper.assertBigWad(order.exchangeableAmount, 10, 'amount');
      return testHelper.assertBigPrice(order.multiplyFactor, 0.9, 'multiplyFactor');
    });
    it('AND the event emits the correct reserved commission and exchangeableAmount', async function() {
      const expectedReservedCommission = wadify(10 * 0.9 * DEFAULT_TOKEN_PRICE)
        .mul(new BN(DEFAULT_COMMISSION_RATE))
        .div(RATE_PRECISION_BN);
      const expectedExchangeableAmount = wadify(10).sub(expectedReservedCommission);
      expectEvent.inLogs(insertionBuyReceipt.logs, 'NewOrderInserted', {
        reservedCommission: expectedReservedCommission,
        exchangeableAmount: expectedExchangeableAmount,
        orderType: testHelper.orderTypes.MARKET_ORDER
      });
    });
    it('AND the orderbook length is updated accordingly', async function() {
      return testHelper.assertBig(await dex.buyOrdersLength(...pair), 1);
    });

    describe('WHEN inserting a sell market order', function() {
      before(async function() {
        insertionSellReceipt = await dex.insertMarketOrderAfter(
          pair[0],
          pair[1],
          wadify(8),
          pricefy(1.3),
          0,
          lifespan,
          false,
          {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          }
        );
      });
      it('THEN the market order is inserted', async function() {
        const order = await dex.getSellOrderAtIndex(...pair, 0);
        expect(order.owner).to.be.equals(accounts[DEFAULT_ACCOUNT_INDEX], 'owner set incorrectly');
        await testHelper.assertBigWad(order.exchangeableAmount, 8, 'exchangeableAmount');
        return testHelper.assertBigPrice(order.multiplyFactor, 1.3, 'multiplyFactor');
      });
      it('AND the event emits the correct price, reserved commission and exchangeableAmount', async function() {
        const expectedReservedCommission = wadify(8 * 1.3 * DEFAULT_TOKEN_PRICE)
          .mul(new BN(DEFAULT_COMMISSION_RATE))
          .div(RATE_PRECISION_BN);
        const expectedExchangeableAmount = wadify(8);
        expectEvent.inLogs(insertionSellReceipt.logs, 'NewOrderInserted', {
          reservedCommission: expectedReservedCommission,
          exchangeableAmount: expectedExchangeableAmount
        });
      });
      it('AND the orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(await dex.sellOrdersLength(...pair), 1, 'sellOrdersLength');
      });
    });
  });
  contract('Ordered insertion of 10 sell market orders at start', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten sell orders are inserted in order at start', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertMarketOrder(
            pair[0],
            pair[1],
            wadify(10),
            pricefy(i + 1),
            lifespan,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        }
      });
      it('THEN the sell market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getSellOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              it + 1,
              'sell market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.sellOrdersLength(...pair),
          10,
          'sell orders length incorrect'
        );
      });
    });
  });
  contract('Ordered insertion of 10 sell market orders', function(accounts) {
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
          await dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(10),
            pricefy(i + 1),
            i,
            lifespan,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        }
      });
      it('THEN the sell market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getSellOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              it + 1,
              'sell market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.sellOrdersLength(...pair),
          10,
          'sell orders length incorrect'
        );
      });
    });
  });
  contract('Ordered insertion of 10 buy market orders at start', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten buy orders are inserted in order at start', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertMarketOrder(
            pair[0],
            pair[1],
            wadify(10),
            pricefy(i + 1),
            lifespan,
            true,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        }
      });
      it('THEN the buy market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getBuyOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              10 - it,
              'buy market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the buy orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.buyOrdersLength(...pair),
          10,
          'buy orders length incorrect'
        );
      });
    });
  });
  contract('Ordered insertion of 10 buy market orders', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten buy orders are inserted in order', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(10),
            pricefy(i + 1),
            0,
            lifespan,
            true,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        }
      });
      it('THEN the buy market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getBuyOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              10 - it,
              'buy market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the buy orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.buyOrdersLength(...pair),
          10,
          'buy orders length incorrect'
        );
      });
    });
  });
  contract('Ordered insertion of 10 sell market at start orders with same amount', function(
    accounts
  ) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten sell orders are inserted with same multiplyFactor at start', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertMarketOrder(pair[0], pair[1], wadify(10), pricefy(1.4), lifespan, false, {
            from: accounts[DEFAULT_ACCOUNT_INDEX]
          });
        }
      });
      it('THEN the inserted sell market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getSellOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              1.4,
              'sell market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the inserted sell orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.sellOrdersLength(...pair),
          10,
          'sell orders length incorrect'
        );
      });
    });
  });
  contract('Ordered insertion of 10 sell market orders with same amount', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(function() {
      return initContractsAndAllowance(accounts);
    });
    describe('GIVEN ten sell orders are inserted with same multiplyFactor', function() {
      before(async function() {
        let i;
        for (i = 0; i < 10; i++) {
          // intentionally sequential
          // eslint-disable-next-line
          await dex.insertMarketOrderAfter(
            pair[0],
            pair[1],
            wadify(10),
            pricefy(1.4),
            i,
            lifespan,
            false,
            {
              from: accounts[DEFAULT_ACCOUNT_INDEX]
            }
          );
        }
      });
      it('THEN the sell market orders are up ordered', async function() {
        await Promise.all(
          [...Array(10).keys()].map(async it => {
            const order = await dex.getSellOrderAtIndex(...pair, it);
            return testHelper.assertBigPrice(
              order.multiplyFactor,
              1.4,
              'sell market orders are not ordered, order price'
            );
          })
        );
      });
      it('AND the orderbook length is updated accordingly', async function() {
        return testHelper.assertBig(
          await dex.sellOrdersLength(...pair),
          10,
          'sell orders length incorrect'
        );
      });
    });
  });
});
