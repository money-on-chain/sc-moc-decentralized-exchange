/* eslint-disable mocha/max-top-level-suites */

const { expect } = require('chai');
const _ = require('lodash');
const { expectEvent } = require('openzeppelin-test-helpers');

const currifiedInTransaction = _.curry(function(receipt, artifact, eventName, event) {
  return expectEvent.inTransaction(receipt.tx, artifact, eventName, event);
});

let wadify;
let pricefy;
let fixBuyerMatchPrecisions;
let fixSellerMatchPrecisions;
let testHelper;
let BaseToken;
let SecondaryToken;
let MoCDecentralizedExchange;
let dex;
let transaction;
let secondaryToken;
let baseToken;
let DEFAULT_ACCOUNT_INDEX;
let DEFAULT_BALANCES_AND_ALLOWANCES;
const MARKET_PRICE = 15;
const filterEvents = (tx, eventName) =>
  tx.logs.filter(it => it.event === eventName).map(it => it.args);

const makeOrderExpectation = order => ({
  id: order.id,
  owner: order.owner,
  exchangeableAmount: order.lockingAmount,
  reservedCommission: 0,
  price: order.price
});

const getExpectation = order =>
  order.expectation ? order.expectation : makeOrderExpectation(order);

const insertSellLimitOrder = (
  baseTokenAddress,
  secondaryTokenAddress,
  orderLockingAmount,
  orderPrice,
  orderLifespan,
  sender
) =>
  dex.insertSellLimitOrder(
    baseTokenAddress,
    secondaryTokenAddress,
    wadify(orderLockingAmount),
    pricefy(orderPrice),
    orderLifespan,
    { from: sender }
  );

const insertBuyLimitOrder = (
  baseTokenAddress,
  secondaryTokenAddress,
  orderLockingAmount,
  orderPrice,
  orderLifespan,
  sender
) =>
  dex.insertBuyLimitOrder(
    baseTokenAddress,
    secondaryTokenAddress,
    wadify(orderLockingAmount),
    pricefy(orderPrice),
    orderLifespan,
    { from: sender }
  );

const insertSellMarketOrder = (
  baseTokenAddress,
  secondaryTokenAddress,
  orderLockingAmount,
  orderPrice,
  orderLifespan,
  sender
) =>
  dex.insertMarketOrder(
    baseTokenAddress,
    secondaryTokenAddress,
    wadify(orderLockingAmount),
    // This may fail if the difference between the price and the
    // market price is too big, causing the multiplier to be out
    // of range
    pricefy(orderPrice / MARKET_PRICE),
    orderLifespan,
    false,
    { from: sender }
  );

const insertBuyMarketOrder = (
  baseTokenAddress,
  secondaryTokenAddress,
  orderLockingAmount,
  orderPrice,
  orderLifespan,
  sender
) =>
  dex.insertMarketOrder(
    baseTokenAddress,
    secondaryTokenAddress,
    wadify(orderLockingAmount),
    // This may fail if the difference between the price and the
    // market price is too big, causing the multiplier to be out
    // of range
    pricefy(orderPrice / MARKET_PRICE),
    orderLifespan,
    true,
    { from: sender }
  );

const expectInsertionEventMarket = isBuy => (
  receipt,
  { baseTokenAddress, secondaryTokenAddress, price, commission, lockingAmount }
) => {
  expectEvent.inTransaction(receipt.tx, MoCDecentralizedExchange, 'NewOrderInserted', {
    baseTokenAddress,
    secondaryTokenAddress,
    exchangeableAmount: wadify(lockingAmount).sub(wadify(commission || 0)),
    reservedCommission: wadify(commission || 0),
    price: pricefy(price / MARKET_PRICE), // This field is actually the priceMultiplier
    isBuy
  });
};

const expectInsertionEventLimit = isBuy => (
  receipt,
  { baseTokenAddress, secondaryTokenAddress, price, commission, lockingAmount }
) =>
  expectEvent.inTransaction(receipt.tx, MoCDecentralizedExchange, 'NewOrderInserted', {
    baseTokenAddress,
    secondaryTokenAddress,
    exchangeableAmount: wadify(lockingAmount).sub(wadify(commission || 0)),
    reservedCommission: wadify(commission || 0),
    price: pricefy(price),
    isBuy
  });

const orderBookMatcherGeneric = (
  insertSellOrder,
  insertBuyOrder,
  expectInsertionSellEvent,
  expectInsertionBuyEvent
) => (getMocHelper, scenario) => {
  contract(scenario.description, function(accounts) {
    // eslint-disable-next-line mocha/no-top-level-hooks
    before(async function() {
      testHelper = await getMocHelper();
      const { commissionRate } = scenario.config || {};
      await testHelper.createContracts({
        owner: accounts[0],
        useFakeDex: true, // We need Fake to access orders at position
        tokenPair: {}, // Will add the default base and secondary pair
        commission: {
          commissionRate: testHelper.wadify(commissionRate || 0)
        },
        ordersForTick: 2,
        maxBlocksForTick: 2,
        minBlocksForTick: 1
      });
      [BaseToken, SecondaryToken, MoCDecentralizedExchange] = [
        testHelper.getBaseToken(),
        testHelper.getSecondaryToken(),
        testHelper.getMoCDex()
      ];

      ({
        wadify,
        pricefy,
        fixBuyerMatchPrecisions,
        fixSellerMatchPrecisions,
        DEFAULT_ACCOUNT_INDEX,
        DEFAULT_BALANCES_AND_ALLOWANCES
      } = testHelper);
      [dex, baseToken, secondaryToken] = await Promise.all([
        testHelper.getDex(),
        testHelper.getBase(),
        testHelper.getSecondary()
      ]);
      dex = await testHelper.decorateGetOrderAtIndex(dex);
      if (!scenario.accounts) {
        // it's easier to set the accounts here instead of
        // handling comparisons against the default balance
        // as a special case
        // eslint-disable-next-line no-param-reassign
        scenario.accounts = DEFAULT_BALANCES_AND_ALLOWANCES;
      }
      await testHelper.setBalancesAndAllowances({
        userData: scenario.accounts,
        accounts
      });
    });

    it(scenario.buyOrders.description, async function() {
      await Promise.all(
        scenario.buyOrders.orders.map(async function(order) {
          const from = accounts[order.accountIndex || DEFAULT_ACCOUNT_INDEX];
          const transferParams = { from, to: dex.address, value: wadify(order.lockingAmount) };
          await insertBuyOrder(
            baseToken.address,
            secondaryToken.address,
            order.lockingAmount,
            order.price,
            5,
            from
          ).then(function(tx) {
            return Promise.all([
              currifiedInTransaction(_, BaseToken, 'Transfer', transferParams)(tx),
              expectInsertionBuyEvent(tx, {
                baseTokenAddress: baseToken.address,
                secondaryTokenAddress: secondaryToken.address,
                ...order
              })
            ]);
          });
        })
      );
    });

    it(scenario.sellOrders.description, async function() {
      await Promise.all(
        scenario.sellOrders.orders.map(async function(order) {
          const from = accounts[order.accountIndex || DEFAULT_ACCOUNT_INDEX];
          const transferParams = { from, to: dex.address, value: wadify(order.lockingAmount) };
          await insertSellOrder(
            baseToken.address,
            secondaryToken.address,
            order.lockingAmount,
            order.price,
            5,
            from
          ).then(function(tx) {
            return Promise.all([
              currifiedInTransaction(_, SecondaryToken, 'Transfer', transferParams)(tx),
              expectInsertionSellEvent(tx, {
                baseTokenAddress: baseToken.address,
                secondaryTokenAddress: secondaryToken.address,
                ...order
              })
            ]);
          });
        })
      );
    });

    it('WHEN instructed to match orders', async function() {
      transaction = await dex.matchOrders(
        baseToken.address,
        secondaryToken.address,
        testHelper.DEFAULT_STEPS_FOR_MATCHING
      );
    });

    // this is done concurrently. This is faster
    // but if more than one assert fails, it is undefined
    // behaviour which one'll show up
    describe('EXECUTION: ', function() {
      it(scenario.buyerMatches.description, function() {
        return Promise.all([
          ...scenario.buyerMatches.matches
            .map(fixBuyerMatchPrecisions)
            .map(currifiedInTransaction(transaction, MoCDecentralizedExchange, 'BuyerMatch')),
          ...scenario.buyerMatches.matches
            .map(matchEvent => ({
              value: wadify(matchEvent.change)
            }))
            .map(currifiedInTransaction(transaction, BaseToken, 'Transfer')),
          ...scenario.buyerMatches.matches
            .filter(matchEvent => !matchEvent.skipSecondaryTransfer)
            .map(matchEvent => ({ value: wadify(matchEvent.received) }))
            .map(currifiedInTransaction(transaction, SecondaryToken, 'Transfer'))
        ]);
      });

      it(scenario.sellerMatches.description, function() {
        return Promise.all([
          ...scenario.sellerMatches.matches
            .map(fixSellerMatchPrecisions)
            .map(currifiedInTransaction(transaction, MoCDecentralizedExchange, 'SellerMatch')),
          ...scenario.sellerMatches.matches
            .map(matchEvent => ({ value: wadify(matchEvent.received) }))
            .map(currifiedInTransaction(transaction, BaseToken, 'Transfer'))
        ]);
      });
    });

    if (scenario.tickEnd) {
      it(scenario.tickEnd.description, function() {
        const tickEndEvents = filterEvents(transaction, 'TickEnd');
        expect(tickEndEvents).to.have.lengthOf(1, 'wrong amount of events of end of tick');
        const [event] = tickEndEvents;
        testHelper.assertTickEnd(transaction, event, scenario.tickEnd.matches);
      });
    }

    if (scenario.remainingSellOrders) {
      it(scenario.remainingSellOrders.description, async function() {
        const ordersLength = await dex.sellOrdersLength(baseToken.address, secondaryToken.address);
        await testHelper.assertBig(
          ordersLength,
          scenario.remainingSellOrders.orders.length,
          'sell orders length'
        );
        await Promise.all(
          [...Array(scenario.remainingSellOrders.orders.length).keys()].map(async function(index) {
            const order = await dex.getSellOrderAtIndex(
              baseToken.address,
              secondaryToken.address,
              index
            );
            testHelper.assertOrder(
              order,
              getExpectation(scenario.remainingSellOrders.orders[index])
            );
          })
        );
      });

      it('contracts secondary token balance is correct after matching', async function() {
        const expectedBalance =
          scenario.remainingSellOrders.dexSecondaryBalance ||
          scenario.remainingSellOrders.orders.reduce((acc, it) => acc + it.lockedAmount, 0);
        return testHelper.assertBigWad(
          await secondaryToken.balanceOf(dex.address),
          expectedBalance,
          'exchange contract Secondary balance'
        );
      });
    }

    if (scenario.remainingBuyOrders) {
      it(scenario.remainingBuyOrders.description, async function() {
        const ordersLength = await dex.buyOrdersLength(baseToken.address, secondaryToken.address);
        await testHelper.assertBig(
          ordersLength,
          scenario.remainingBuyOrders.orders.length,
          'buy orders length'
        );
        await Promise.all(
          [...Array(scenario.remainingBuyOrders.orders.length).keys()].map(async function(index) {
            const order = await dex.getBuyOrderAtIndex(
              baseToken.address,
              secondaryToken.address,
              index
            );
            testHelper.assertOrder(
              order,
              getExpectation(scenario.remainingBuyOrders.orders[index])
            );
          })
        );
      });

      it('contracts primary token balance is correct after matching', async function() {
        const expectedBalance =
          scenario.remainingBuyOrders.dexBaseBalance ||
          scenario.remainingBuyOrders.orders.reduce((acc, it) => acc + it.lockedAmount, 0);
        return testHelper.assertBigWad(
          await baseToken.balanceOf(dex.address),
          expectedBalance,
          'exchange contract base balance'
        );
      });
    }

    if (scenario.custom) {
      const getContext = () => ({
        testHelper,
        dex,
        MoCDecentralizedExchange,
        baseToken,
        secondaryToken,
        transaction
      });

      scenario.custom.forEach(custom => it(custom.description, custom.it(getContext)));
    }
  });
};

const orderBookMatcherMarket = orderBookMatcherGeneric(
  insertSellMarketOrder,
  insertBuyMarketOrder,
  expectInsertionEventMarket(false),
  expectInsertionEventMarket(true)
);

const orderBookMatcherLimit = orderBookMatcherGeneric(
  insertSellLimitOrder,
  insertBuyLimitOrder,
  expectInsertionEventLimit(false),
  expectInsertionEventLimit(true)
);

const orderBookMatcherCombined = orderBookMatcherGeneric(
  insertSellMarketOrder,
  insertBuyLimitOrder,
  expectInsertionEventMarket(false),
  expectInsertionEventLimit(true)
);

const orderBookMatcherBothTypes = (getMocHelper, scenario) => {
  describe('Orderbook matching - Limit order', function() {
    orderBookMatcherLimit(getMocHelper, scenario);
  });
  describe.skip('Orderbook matching - Market order', function() {
    orderBookMatcherMarket(getMocHelper, scenario);
  });
  describe.skip('Orderbook matching - Combined order', function() {
    orderBookMatcherCombined(getMocHelper, scenario);
  });
};
module.exports = { orderBookMatcherBothTypes, orderBookMatcherMarket, orderBookMatcherLimit };
