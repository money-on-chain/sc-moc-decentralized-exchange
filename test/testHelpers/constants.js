const { constants } = require('openzeppelin-test-helpers');

const BigNumber = require('bignumber.js');

const { BN } = web3.utils;

const RATE_PRECISION = new BigNumber('1e18');
module.exports = {
  DEFAULT_ORDER_FOR_TICKS: 8,
  DEFAULT_MAX_BLOCKS_FOR_TICK: 12,
  DEFAULT_MIN_BLOCKS_FOR_TICK: 4,
  DEFAULT_MIN_ORDER_AMOUNT: new BN(0).toString(),
  DEFAULT_MAX_ORDER_LIFESPAN: 10,
  DEFAULT_COMMISSION_RATE: new BN(0).toString(),
  DEFAULT_MIN_MO_MULTIPLY_FACTOR: 0.01,
  // Purposely put a very high max to help make more extreme tests
  DEFAULT_MAX_MO_MULTIPLY_FACTOR: 199,
  DEFAULT_CANCELATION_PENALTY_RATE: new BN(0).toString(),
  DEFAULT_EXPIRATION_PENALTY_RATE: new BN(0).toString(),
  DEFAULT_ACCOUNT_INDEX: 1,
  DEFAULT_STEPS_FOR_MATCHING: 100,
  WAD_PRECISION: 10 ** 18,
  RATE_PRECISION: RATE_PRECISION.toNumber(),
  RATE_PRECISION_BN: new BN(RATE_PRECISION.toFixed()),
  DEFAULT_PRICE_PRECISION: 10 ** 18,
  DEFAULT_BALANCE: 999999,
  DEFAULT_ERROR_VALUE: constants.MAX_UINT256,
  DEFAULT_PRICE: 1,
  DEFAULT_AMOUNT: 10,
  DEFAULT_LIFESPAN: 5,
  tickStages: {
    RECEIVING_ORDERS: 0,
    RUNNING_SIMULATION: 1,
    RUNNING_MATCHING: 2,
    MOVING_PENDING_ORDERS: 3
  },
  MAX_PENDING_TXS: 20,
  orderTypes: {
    LIMIT_ORDER: new BN(0),
    MARKET_ORDER: new BN(1)
  }
};
