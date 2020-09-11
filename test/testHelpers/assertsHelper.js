const _ = require('lodash');
const { BigNumber } = require('bignumber.js');
const { expect, use } = require('chai');
const { expectEvent } = require('openzeppelin-test-helpers');

const { BN, isBN } = web3.utils;

use(require('bn-chai')(BN));

const currifiedInLogs = _.curry(function(receipt, eventName, event) {
  return expectEvent.inLogs(receipt.logs, eventName, event);
});

const assertAddresses = (actual, expected, _msg) => {
  const extendedMsg = `${_msg} : Expecting ${actual.toString()} to be equal to ${expected.toString()}`;
  return expect(actual).to.equal(expected, extendedMsg);
};

const assertBigWithPrecision = precisionBN => async (actual, expected, _msg, opt) => {
  const actualValue = await actual;
  let bnActual = actualValue;

  if (!isBN(actualValue)) {
    // String value probably provided by web3 getBalance
    bnActual = new BN(actualValue);
  }
  const bigNumberExpected = new BigNumber(expected);
  // This is a workaround to be able to expect floats
  const expectedWithPrecision = bigNumberExpected
    .times(precisionBN.toString())
    .integerValue()
    .toFixed();
  const bnExpected = new BN(expectedWithPrecision);
  if (opt && opt.significantDigits && bnExpected.toString().length > opt.significantDigits) {
    const insignificantDigits = bnExpected.toString().length - opt.significantDigits;
    const padding = new BN(10).pow(new BN(insignificantDigits));
    const downLimit = bnExpected.sub(padding);
    const upperLimit = bnExpected.add(padding);
    const extendedMsg = `${_msg}, based on expected ${expected} with ${opt.significantDigits} significant digits`;
    return (
      expect(bnActual, extendedMsg).to.be.gte.BN(downLimit) &&
      expect(bnActual, extendedMsg).to.be.lte.BN(upperLimit)
    );
  }
  return expect(bnActual, _msg).to.eq.BN(bnExpected);
};

const gtBig = precision => (big, expected, msg, opt) => {
  const expectedBN = new BN((expected * precision).toString());
  if (opt && opt.tolerance) {
    const diff = big.minus(expectedBN);
    const tolerance = new BN(((precision * 10) / 10 ** opt.tolerance).toString());
    return diff.abs().lte(tolerance, msg);
  }
  return expect(big, msg).to.be.gt.BN(expectedBN);
};

const convertExpectedIntoContractPrecision = (wadify, pricefy) => expected => {
  const converter = convertFieldsIntoContractPrecision(wadify, pricefy);
  if (Array.isArray(expected)) return expected.map(converter);
  return [converter(expected)];
};

const convertFieldsIntoContractPrecision = (wadify, pricefy) => ({
  orderId,
  matchPrice,
  filled,
  skipSecondaryTransfer,
  ...args
}) => {
  const withPrecision = {
    orderId: orderId.toString()
  };
  if (matchPrice) Object.assign(withPrecision, { matchPrice: pricefy(matchPrice) });
  if (filled) Object.assign(withPrecision, { remainingAmount: wadify(0) });

  return args
    ? Object.keys(args).reduce(
        (acum, key) => Object.assign({}, acum, { [key]: wadify(args[key]) }),
        withPrecision
      )
    : withPrecision;
};

const fixBuyerMatchPrecisions = convertFieldsIntoContractPrecision;

const fixSellerMatchPrecisions = convertFieldsIntoContractPrecision;

const assertBuyerMatch = (wadify, pricefy) => (transaction, expected) =>
  convertExpectedIntoContractPrecision(wadify, pricefy)(expected).map(
    currifiedInLogs(transaction, 'BuyerMatch')
  );

const assertSellerMatch = (wadify, pricefy) => (transaction, expected) =>
  convertExpectedIntoContractPrecision(wadify, pricefy)(expected).map(
    currifiedInLogs(transaction, 'SellerMatch')
  );

const assertTickEnd = m => ({ receipt: { blockNumber } }, got, expected) => {
  m.assertBig(got.nextTickBlock, blockNumber + expected.blocksForTick, 'Tick next Block');
  if (expected.number) m.assertBig(got.number, expected.number, 'Tick Number');
  if (expected.closingPrice)
    m.assertBigPrice(got.closingPrice, expected.closingPrice, 'Tick Closing Price');
};

const assertOrder = m => (order, expected) => {
  const asserters = {
    id: { assert: m.assertBig },
    owner: { assert },
    exchangeableAmount: { assert: m.assertBigWad },
    reservedCommission: { assert: m.assertBigWad },
    price: { assert: m.assertBigPrice }
  };
  return Promise.all(
    Object.keys(asserters).map(async function(field) {
      if (expected[field])
        return asserters[field].assert(
          order[field],
          expected[field],
          `order ${field} is incorrect`
        );
    })
  );
};

const assertNewOrderEvent = function(wadify, pricefy, eventName) {
  return ({ price, amount, multiplyFactor, ...props }, getContext) => {
    const { tx, baseAddress, secondaryAddress } = getContext();

    const usualProps = {
      baseTokenAddress: baseAddress,
      secondaryTokenAddress: secondaryAddress
    };
    if (amount) Object.assign(usualProps, { amount: wadify(amount) });
    if (price) Object.assign(usualProps, { price: pricefy(price) });
    if (multiplyFactor) Object.assign(usualProps, { multiplyFactor: pricefy(multiplyFactor) });
    const eventProps = Object.assign(usualProps, props);
    return expectEvent.inLogs(tx.logs, eventName, eventProps);
  };
};

const assertBalance = m => async (token, address, expected) =>
  token.balanceOf(address).then(actual => Promise.resolve(m.assertBig(actual, expected)));

const assertBalanceWad = m => async (token, address, expected) =>
  token.balanceOf(address).then(actual => Promise.resolve(m.assertBigWad(actual, expected)));

const assertBuySellMatchEvents = (txReceipt, { buyOrderId, sellOrderId, ...props }) =>
  expectEvent.inLogs(txReceipt.logs, 'BuyerMatch', { orderId: buyOrderId, ...props }) &&
  expectEvent.inLogs(txReceipt.logs, 'SellerMatch', { orderId: sellOrderId, ...props });

const assertTickStage = m => (dex, pair) =>
  function(expected) {
    return m.assertBig(dex.getTickStage(...pair), expected);
  };

module.exports = function({ DEFAULT_PRICE_PRECISION, WAD_PRECISION, wadify, pricefy }) {
  const me = {
    gtBig: gtBig(1),
    assertBig: assertBigWithPrecision(1),
    assertBigWad: assertBigWithPrecision(WAD_PRECISION),
    assertBigPrice: assertBigWithPrecision(DEFAULT_PRICE_PRECISION)
  };

  return {
    ...me,
    assertAddresses,
    assertBigWithPrecision,
    assertNewOrderEvent: assertNewOrderEvent(wadify, pricefy, 'NewOrderInserted'),
    assertTickEnd: assertTickEnd(me),
    assertOrder: assertOrder(me),
    assertBalance: assertBalance(me),
    assertBalanceWad: assertBalanceWad(me),
    assertBuySellMatchEvents,
    fixBuyerMatchPrecisions: fixBuyerMatchPrecisions(wadify, pricefy),
    fixSellerMatchPrecisions: fixSellerMatchPrecisions(wadify, pricefy),
    assertBuyerMatch: assertBuyerMatch(wadify, pricefy),
    assertSellerMatch: assertSellerMatch(wadify, pricefy),
    assertTickStage: assertTickStage(me)
  };
};
