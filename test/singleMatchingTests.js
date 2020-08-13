/* eslint-disable mocha/no-async-describe */

const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { orderBookMatcherBothTypes } = require('./testHelpers/orderBookMatcher');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Dex: Single matching tests', function() {
  let testHelper;
  before(function() {
    testHelper = testHelperBuilder();
  });

  const matcher = _.curry(orderBookMatcherBothTypes)(() => testHelper);
  [
    {
      description: 'single match, both orders filled',
      config: {
        commissionRate: 0 // no commission
      },
      accounts: {
        1: { baseBalance: 20, baseAllowance: 20, secondaryBalance: 20, secondaryAllowance: 20 },
        2: { baseBalance: 20, baseAllowance: 20, secondaryBalance: 20, secondaryAllowance: 20 }
      },
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 10, price: 1, accountIndex: 1, commission: 0 }]
      },
      sellOrders: {
        description: 'AND a sell order at the same price',
        orders: [{ lockingAmount: 10, price: 1, accountIndex: 2, commission: 0 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has no change',
        matches: [
          {
            orderId: 1,
            amountSent: 10,
            change: 0,
            received: 10,
            commission: 0,
            matchPrice: 1,
            filled: true
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has no surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 10,
            commission: 0,
            received: 10,
            surplus: 0,
            matchPrice: 1,
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
      },
      expectedAccounts: [{ balance: 20, allowance: 20 }, { balance: 20, allowance: 20 }]
    },
    {
      description: 'single match, both orders filled, sell.price < matchPrice < buy.price',
      config: {
        commissionRate: 0.1 // 10%
      },
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 150, price: 20, commission: 15 }]
      },
      sellOrders: {
        description: 'AND a sell order at different prices',
        orders: [{ lockingAmount: 7.5, price: 10, commission: 0.75 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has a match with some change',
        matches: [
          {
            orderId: 1,
            amountSent: 101.25,
            change: 37.5,
            received: 6.75,
            commission: 11.25,
            matchPrice: 15,
            filled: true
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has some surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 6.75,
            commission: 0.75,
            received: 101.25,
            surplus: 33.75,
            matchPrice: 15,
            filled: true
          }
        ]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is empty',
        orders: [],
        dexBaseBalance: 11.25
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is empty',
        orders: [],
        dexSecondaryBalance: 0.75
      }
    },
    {
      description:
        'single match, sell order filled, sell.price < matchPrice < buy.price. The correct lockingAmount is substracted from the buy order',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 200, price: 20 }]
      },
      sellOrders: {
        description: 'AND a sell order at different prices',
        orders: [{ lockingAmount: 7.5, price: 10 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has a match with some change',
        matches: [
          {
            orderId: 1,
            amountSent: 112.5,
            change: 37.5,
            remainingAmount: 50,
            received: 7.5,
            commission: 0,
            matchPrice: 15
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has some surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 7.5,
            commission: 0,
            received: 112.5,
            surplus: 37.5,
            matchPrice: 15,
            filled: true
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is empty',
        orders: []
      },
      remainingBuyOrders: {
        description: 'AND the buy still has an order',
        orders: [{ id: 1, lockedAmount: 50, price: 20 }]
      }
    },
    {
      description:
        'single match, buy order filled, sell.price < matchPrice < buy.price. The correct lockingAmount is substracted from the sell order',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 100, price: 20 }]
      },
      sellOrders: {
        description: 'AND a sell order at different prices',
        orders: [{ lockingAmount: 7.5, price: 10 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has a match with some change',
        matches: [
          {
            orderId: 1,
            amountSent: 75,
            change: 25,
            received: 5,
            commission: 0,
            matchPrice: 15,
            filled: true
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has some surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 5,
            commission: 0,
            received: 75,
            surplus: 25,
            remainingAmount: 2.5,
            matchPrice: 15
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook still has an order',
        orders: [{ id: 2, lockedAmount: 2.5, price: 10 }]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is empty',
        orders: []
      }
    },
    {
      description: 'single match, same price, only buy order filled',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 10, price: 1 }]
      },
      sellOrders: {
        description: 'AND a sell order at the same prices',
        orders: [{ lockingAmount: 20, price: 1 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has a match with no change',
        matches: [
          {
            orderId: 1,
            amountSent: 10,
            change: 0,
            received: 10,
            commission: 0,
            matchPrice: 1,
            filled: true
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has no surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 10,
            commission: 0,
            received: 10,
            surplus: 0,
            remainingAmount: 10,
            matchPrice: 1
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook still has an order',
        orders: [{ id: 2, lockedAmount: 10, price: 1 }]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is empty',
        orders: []
      }
    },
    {
      description: 'single match, same price, only sell order filled',
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 20, price: 1 }]
      },
      sellOrders: {
        description: 'AND a sell order at the same prices',
        orders: [{ lockingAmount: 10, price: 1 }]
      },
      buyerMatches: {
        description: 'THEN the buyer has a match with no change',
        matches: [
          {
            orderId: 1,
            amountSent: 10,
            change: 0,
            remainingAmount: 10,
            received: 10,
            commission: 0,
            matchPrice: 1
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has no surplus',
        matches: [
          {
            orderId: 2,
            amountSent: 10,
            commission: 0,
            received: 10,
            surplus: 0,
            matchPrice: 1,
            filled: true
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook is empty',
        orders: []
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook still has an order',
        orders: [{ id: 1, lockedAmount: 10, price: 1 }]
      }
    },
    {
      description: 'single match, buy orders filled, small price difference',
      config: {
        commissionRate: 0 // no commission
      },
      accounts: {
        1: {
          baseBalance: 200000,
          baseAllowance: 200000,
          secondaryBalance: 200000,
          secondaryAllowance: 200000
        },
        2: {
          baseBalance: 200000,
          baseAllowance: 200000,
          secondaryBalance: 200000,
          secondaryAllowance: 200000
        }
      },
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 200, price: 2.02, accountIndex: 1, commission: 0 }]
      },
      sellOrders: {
        description: 'AND a sell order at the same price',
        orders: [{ lockingAmount: 1000, price: 1.98, accountIndex: 2, commission: 0 }]
      },
      buyerMatches: {
        description: 'THEN the buyer is filled',
        matches: [
          {
            orderId: 1,
            amountSent: new BigNumber('198.019801980198019800'),
            change: new BigNumber('200').minus('198.019801980198019800'),
            received: new BigNumber('99.009900990099009900'),
            commission: 0,
            matchPrice: 2,
            filled: true
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller has still amount left',
        matches: [
          {
            orderId: 2,
            amountSent: new BigNumber('99.009900990099009900'),
            commission: 0,
            received: new BigNumber('198.019801980198019800'),
            surplus: new BigNumber('1.980198019801980198'),
            remainingAmount: new BigNumber('1000').minus('99.009900990099009900'),
            matchPrice: 2
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook still has an order',
        orders: [
          {
            id: 2,
            lockedAmount: new BigNumber('1000').minus('99.009900990099009900'),
            price: 1.98
          }
        ]
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is empty',
        orders: []
      },
      expectedAccounts: [{ balance: 20, allowance: 20 }, { balance: 20, allowance: 20 }]
    },
    {
      description: 'single match, sell orders filled, small price difference',
      config: {
        commissionRate: 0 // no commission
      },
      accounts: {
        1: {
          baseBalance: 200000,
          baseAllowance: 200000,
          secondaryBalance: 200000,
          secondaryAllowance: 200000
        },
        2: {
          baseBalance: 200000,
          baseAllowance: 200000,
          secondaryBalance: 200000,
          secondaryAllowance: 200000
        }
      },
      buyOrders: {
        description: 'GIVEN there is a buy order',
        orders: [{ lockingAmount: 2000, price: 2.02, accountIndex: 1, commission: 0 }]
      },
      sellOrders: {
        description: 'AND a sell order at the same price with an amount with a very high precision',
        orders: [
          {
            lockingAmount: new BigNumber('100.001001001001001001'),
            price: 1.98,
            accountIndex: 2,
            commission: 0
          }
        ]
      },
      buyerMatches: {
        description: 'THEN the buyer has still amount left',
        matches: [
          {
            orderId: 1,
            amountSent: new BigNumber('200.002002002002002002'),
            change: new BigNumber('202.002022022022022022').minus('200.002002002002002002'),
            received: new BigNumber('100.001001001001001001'),
            remainingAmount: new BigNumber('2000').minus('202.002022022022022022'),
            commission: 0,
            matchPrice: 2
          }
        ]
      },
      sellerMatches: {
        description: 'AND the seller is filled',
        matches: [
          {
            orderId: 2,
            amountSent: new BigNumber('100.001001001001001001'),
            commission: 0,
            received: new BigNumber('200.002002002002002002'),
            surplus: new BigNumber('200.002002002002002002').minus('198.001981981981981981'),
            matchPrice: 2,
            filled: true
          }
        ]
      },
      remainingSellOrders: {
        description: 'AND the sell orderbook still has an order',
        orders: []
      },
      remainingBuyOrders: {
        description: 'AND the buy orderbook is empty',
        orders: [
          {
            id: 1,
            lockedAmount: new BigNumber('2000').minus('202.002022022022022022'),
            price: 2.02
          }
        ]
      },
      expectedAccounts: [{ balance: 20, allowance: 20 }, { balance: 20, allowance: 20 }]
    }
  ].forEach(matcher);
});
