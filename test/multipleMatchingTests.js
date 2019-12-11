const _ = require('lodash');
const { orderBookMatcher } = require('./testHelpers/orderBookMatcher');
const testHelperBuilder = require('./testHelpers/testHelper');

const scenarios = [
  {
    description: 'One sell order matches against two buy orders, both orderbooks depleted',
    config: {
      commissionRate: 0.01 // 1%
    },
    buyOrders: {
      description: 'GIVEN there are two buy orders',
      orders: [
        { lockingAmount: 120, price: 10, commission: 1.2 }, // orderId: 1
        { lockingAmount: 60, price: 20, commission: 0.6 } // orderId: 2
      ]
    },
    sellOrders: {
      description: 'AND a sell order that fills them completely',
      orders: [{ lockingAmount: 15, price: 10, commission: 0.15 }] // orderId: 3
    },
    buyerMatches: {
      description: 'AND the first buyer matches with 30 change, the secondwithout change',
      matches: [
        {
          orderId: 2,
          amountSent: 29.7,
          change: 30,
          received: 2.97,
          commission: 0.3,
          matchPrice: 10,
          filled: true
        },
        {
          orderId: 1,
          amountSent: 118.8,
          change: 0,
          received: 11.88,
          commission: 1.2,
          matchPrice: 10,
          filled: true
        }
      ]
    },
    sellerMatches: {
      description: 'AND the seller matches without surplus',
      matches: [
        {
          orderId: 3,
          amountSent: 2.97,
          commission: 0.03,
          received: 29.7,
          surplus: 0,
          remainingAmount: 11.88,
          matchPrice: 10
        },
        {
          orderId: 3,
          amountSent: 11.88,
          commission: 0.12,
          received: 118.8,
          surplus: 0,
          matchPrice: 10,
          filled: true
        }
      ]
    },
    remainingSellOrders: {
      description: 'AND the sell orderbook is empty',
      orders: [],
      dexSecondaryBalance: 0.15
    },
    remainingBuyOrders: {
      description: 'AND the buy orderbook is empty',
      orders: [],
      dexBaseBalance: 1.5
    }
  },
  {
    description:
      'two sell orders match against two buy orders, two complete fills at different prices, both orderbooks depleted',
    config: {
      commissionRate: 0 // no commission
    },
    buyOrders: {
      description: 'GIVEN there are two buy orders',
      orders: [{ lockingAmount: 240, price: 80 }, { lockingAmount: 100, price: 100 }]
    },
    sellOrders: {
      description: 'AND two sell orders that match the buy orders 1v1',
      orders: [{ lockingAmount: 3, price: 55 }, { lockingAmount: 1, price: 45 }]
    },
    buyerMatches: {
      description: 'AND both matches are at the emergent price(buyer)',
      matches: [
        {
          orderId: 2,
          amountSent: 67.5,
          change: 32.5,
          received: 1,
          commission: 0,
          matchPrice: 67.5,
          filled: true
        },
        {
          orderId: 1,
          amountSent: 202.5,
          change: 37.5,
          received: 3,
          commission: 0,
          matchPrice: 67.5,
          filled: true
        }
      ]
    },
    sellerMatches: {
      description: 'AND both matches are at the emergent price(seller)',
      matches: [
        {
          orderId: 4,
          amountSent: 1,
          commission: 0,
          received: 67.5,
          surplus: 22.5,
          matchPrice: 67.5,
          filled: true
        },
        {
          orderId: 3,
          amountSent: 3,
          commission: 0,
          received: 202.5,
          surplus: 37.5,
          matchPrice: 67.5,
          filled: true
        }
      ]
    },
    remainingSellOrders: {
      description: 'AND the sell orderbook is empty',
      orders: []
    },
    remainingBuyOrders: {
      description: 'AND the buy orderbook is empty',
      orders: []
    }
  },
  {
    description:
      'two sell orders match against one buy order, two fills at different prices, matching stops for buy price lower than sell price, both orderbooks with one order remaining each ',
    config: {
      commissionRate: 0.001 // 0.1%
    },
    buyOrders: {
      description: 'GIVEN there is a buy order',
      orders: [{ lockingAmount: 700, price: 70, commission: 0.7 }] // orderId: 1
    },
    sellOrders: {
      description: 'AND tree sell orders',
      orders: [
        { lockingAmount: 1, price: 100, commission: 0.001 }, // orderId: 2
        { lockingAmount: 5, price: 60, commission: 0.005 }, // orderId: 3
        { lockingAmount: 3, price: 40, commission: 0.003 } // orderId: 4
      ]
    },
    buyerMatches: {
      description: 'THEN the buyer has two matches at 65',
      matches: [
        {
          orderId: 1,
          amountSent: 194.805,
          change: 15,
          remainingAmount: 489.51,
          received: 2.997,
          commission: 0.195,
          matchPrice: 65
        },
        {
          orderId: 1,
          amountSent: 324.675,
          change: 25,
          remainingAmount: 139.86,
          received: 4.995,
          commission: 0.325,
          matchPrice: 65
        }
      ]
    },
    sellerMatches: {
      description: 'THEN the seller has two matches at 65',
      matches: [
        {
          orderId: 4,
          amountSent: 2.997,
          commission: 0.003,
          received: 194.805,
          surplus: 74.925,
          filled: true,
          matchPrice: 65
        },
        {
          orderId: 3,
          amountSent: 4.995,
          commission: 0.005,
          received: 324.675,
          surplus: 24.975,
          filled: true,
          matchPrice: 65
        }
      ]
    },
    remainingSellOrders: {
      description: 'AND the sell orderbook still has an order',
      orders: [{ id: 2, lockedAmount: 1, price: 100 }],
      dexSecondaryBalance: 1.008
    },
    remainingBuyOrders: {
      description: 'AND the buy order is not completely filled',
      orders: [{ id: 1, lockedAmount: 139.86, price: 70 }],
      dexBaseBalance: 140.52
    }
  }
];

let testHelper;

describe('Dex: Multiple matching tests', function() {
  before(function() {
    testHelper = testHelperBuilder();
  });
  scenarios.forEach(_.curry(orderBookMatcher)(() => testHelper));
});
