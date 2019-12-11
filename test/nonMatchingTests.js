/* eslint-disable mocha/no-async-describe */

const _ = require('lodash');
const { orderBookMatcher } = require('./testHelpers/orderBookMatcher');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Dex: Non matching tests', function() {
  let testHelper;
  before(function() {
    testHelper = testHelperBuilder();
  });

  const matcher = _.curry(orderBookMatcher)(() => testHelper);
  [
    {
      description: 'there are buy and sell orders, but they should not match',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 2, price: 1 }]
      },
      sellOrders: {
        description: 'AND a sell order at a higher price',
        orders: [{ lockingAmount: 2, price: 2 }]
      },
      buyerMatches: {
        description: 'THEN the buyer does not have any matches',
        matches: []
      },
      sellerMatches: {
        description: 'AND the seller does not have any matches',
        matches: []
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is not modified',
        orders: [{ lockedAmount: 2, price: 2 }]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is not modified',
        orders: [{ lockedAmount: 2, price: 1 }]
      }
    },
    {
      description: 'there are no orders, therefore there should be no matches',
      buyOrders: {
        description: 'GIVEN there are no buy orders',
        orders: []
      },
      sellOrders: {
        description: 'AND no sell orders',
        orders: []
      },
      buyerMatches: {
        description: 'THEN the buyer does not have any matches',
        matches: []
      },
      sellerMatches: {
        description: 'AND the seller does not have any matches',
        matches: []
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is not modified',
        orders: []
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is not modified',
        orders: []
      }
    },
    {
      description: 'there are only sell orders, therefore there should be no matches',
      buyOrders: {
        description: 'GIVEN there no buy orders',
        orders: []
      },
      sellOrders: {
        description: 'AND a sell order',
        orders: [{ lockingAmount: 1, price: 2 }]
      },
      buyerMatches: {
        description: 'THEN the buyer does not have any matches',
        matches: []
      },
      sellerMatches: {
        description: 'AND the seller does not have any matches',
        matches: []
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is not modified',
        orders: [{ lockedAmount: 1, price: 2 }]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is not modified',
        orders: []
      }
    },
    {
      description: 'there are only buy orders, therefore there should be no matches',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 1, price: 2 }]
      },
      sellOrders: {
        description: 'AND not a sell order',
        orders: []
      },
      buyerMatches: {
        description: 'THEN the buyer does not have any matches',
        matches: []
      },
      sellerMatches: {
        description: 'AND the seller does not have any matches',
        matches: []
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is not modified',
        orders: []
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is not modified',
        orders: [{ lockedAmount: 1, price: 2 }]
      }
    }
  ].forEach(matcher);
});
