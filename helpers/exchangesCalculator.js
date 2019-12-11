const BigNumber = require('bignumber.js');

BigNumber.set({ DECIMAL_PLACES: 30 });

const avg = (left, right) => left.plus(right).div(2);
const convertToBase = (secondary, price) => secondary.times(price);
const convertToSecondary = (base, price) => base.div(price);
const fixOrderTypes = ({ price, amount }) => ({
  price: BigNumber(price),
  amount: BigNumber(amount)
});

// const [WAD_PRECISION, DEFAULT_PRICE_PRECISION] = [18, 18];

module.exports = {
  avg,
  wadify(amount) {
    return BigNumber(amount).times(BigNumber(10).pow(18));
  },
  match: function match(_buy, _sell, _price) {
    const [buy, sell] = [_buy, _sell].map(fixOrderTypes);
    const price = _price ? BigNumber(_price) : avg(buy.price, sell.price);
    const buyerIntent = convertToSecondary(buy.amount, buy.price);
    const limitingAmount = sell.amount.gt(buyerIntent) ? buyerIntent : sell.amount;
    const primarySent = convertToBase(limitingAmount, price);
    const buyerExpectedSend = convertToBase(limitingAmount, buy.price);
    const sellerExpectedReturn = convertToBase(limitingAmount, sell.price);
    const change = buyerExpectedSend.minus(primarySent);
    const surplus = primarySent.minus(sellerExpectedReturn);
    return {
      BuyerMatch: {
        sent: primarySent.toFixed(),
        change: change.toFixed(),
        expectedSend: buyerExpectedSend.toFixed(),
        received: limitingAmount.toFixed(),
        matchPrice: price.toFixed()
      },
      SellerMatch: {
        matchedAmount: limitingAmount.toFixed(),
        surplus: surplus.toFixed(),
        expectedReturn: sellerExpectedReturn.toFixed(),
        totalReceived: primarySent.toFixed(),
        matchPrice: price.toFixed()
      },
      buy: {
        amount: buy.amount.minus(buyerExpectedSend).toFixed(),
        price: buy.price.toFixed()
      },
      sell: {
        amount: sell.amount.minus(limitingAmount).toFixed(),
        price: sell.price.toFixed()
      }
    };
  }
};
