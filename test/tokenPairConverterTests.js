const BigNumber = require('bignumber.js');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Token Pair Converter Test', function() {
  let dex;
  let commonBase;
  let someToken;
  let otherToken;
  let governor;
  let invalidTokenAddress;
  let result;
  let testHelper;
  let wadify;
  let toBNWithPrecision;
  let priceProvider;
  let DEFAULT_PRICE_PRECISION;
  let DEFAULT_ERROR_VALUE;

  const createNewPair = () =>
    async function({ base, secondary, lastClosingPrice, pricePrecision }) {
      const pricePrecisionToUse = pricePrecision
        ? (10 ** pricePrecision).toString()
        : DEFAULT_PRICE_PRECISION.toString();
      await dex.addTokenPair(
        base().address,
        secondary().address,
        priceProvider.address,
        pricePrecisionToUse,
        toBNWithPrecision(lastClosingPrice, pricePrecisionToUse),
        governor
      );
    };

  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, toBNWithPrecision, DEFAULT_PRICE_PRECISION, DEFAULT_ERROR_VALUE } = testHelper);
  });

  const init = ({ getToken, getBaseToken, pairsNeeded, amount, owner }) =>
    async function() {
      await testHelper.createContracts({
        owner
      });
      const OwnerBurnableToken = await testHelper.getOwnerBurnableToken();
      [dex, commonBase, someToken, otherToken, governor, priceProvider] = await Promise.all([
        testHelper.getDex(),
        testHelper.getBase(),
        OwnerBurnableToken.new(),
        OwnerBurnableToken.new(),
        testHelper.getGovernor(),
        testHelper.getTokenPriceProviderFake().new()
      ]);
      invalidTokenAddress = governor.address;
      dex = testHelper.decorateGovernedSetters(dex, governor);
      await Promise.all(pairsNeeded.map(createNewPair(dex, governor)));
      result = await dex.convertTokenToCommonBase(
        getToken().address,
        wadify(amount),
        getBaseToken ? getBaseToken().address : invalidTokenAddress
      );
    };

  const testTokenConversion = function({ amount, expectedResult, ...initParams }) {
    return function([owner]) {
      describe(`WHEN trying to convert the given amount: ${amount}`, function() {
        before(init({ amount, owner, ...initParams }));
        it(`THEN the result should be expected one: ${expectedResult}`, function() {
          return testHelper.assertBigWad(result, expectedResult, 'amount converted into DoC');
        });
      });
    };
  };

  contract('RULE: If the given token does not exist, should be no possible conversion', function([
    owner
  ]) {
    describe('WHEN trying to convert an amount from a token without pair', function() {
      before(
        init({
          amount: 10,
          getToken: () => someToken,
          pairsNeeded: [],
          owner
        })
      );
      it('THEN the result should be the default for error cases', function() {
        return testHelper.assertBig(result, DEFAULT_ERROR_VALUE, 'amount converted into DoC');
      });
    });
  });

  contract(
    'RULE: If the given token is the common base, the amount should remain the same',
    testTokenConversion({
      description: 'RULE: If the given token is the common base, the amount should remain the same',
      amount: 10,
      expectedResult: 10,
      getToken: () => commonBase,
      pairsNeeded: []
    })
  );

  contract(
    'RULE: simple conversion. from a secondary token to its base who also is the common base',
    testTokenConversion({
      amount: 10,
      expectedResult: 30,
      getToken: () => someToken,
      pairsNeeded: [{ base: () => commonBase, secondary: () => someToken, lastClosingPrice: 3 }]
    })
  );

  contract(
    'RULE: 2 steps conversion. from a secondary token to its base and then to the common base',
    testTokenConversion({
      amount: 10,
      expectedResult: 150,
      getToken: () => otherToken,
      getBaseToken: () => someToken,
      pairsNeeded: [
        { base: () => commonBase, secondary: () => someToken, lastClosingPrice: 3 },
        { base: () => someToken, secondary: () => otherToken, lastClosingPrice: 5 }
      ]
    })
  );

  contract(
    'RULE: Conversion between pairs with different price precision should be possible',
    testTokenConversion({
      amount: 10,
      expectedResult: 15,
      getToken: () => otherToken,
      getBaseToken: () => someToken,
      pairsNeeded: [
        {
          base: () => commonBase,
          secondary: () => someToken,
          lastClosingPrice: 0.3,
          pricePrecision: 6
        },
        {
          base: () => someToken,
          secondary: () => otherToken,
          lastClosingPrice: 5,
          pricePrecision: 1
        }
      ]
    })
  );

  contract(
    'RULE: Conversion between pairs with different price precision and price scale',
    testTokenConversion({
      amount: 0.002,
      expectedResult: 0.6,
      getToken: () => otherToken,
      getBaseToken: () => someToken,
      pairsNeeded: [
        {
          base: () => commonBase,
          secondary: () => someToken,
          lastClosingPrice: 3,
          pricePrecision: 10
        },
        {
          base: () => someToken,
          secondary: () => otherToken,
          lastClosingPrice: 100,
          pricePrecision: 1
        }
      ]
    })
  );

  contract(
    'RULE: Conversion with a truncate result',
    testTokenConversion({
      amount: 1.7,
      expectedResult: 5 * 10 ** -18, // truncate of 0.1
      getToken: () => otherToken,
      getBaseToken: () => commonBase,
      pairsNeeded: [
        {
          base: () => commonBase,
          secondary: () => otherToken,
          lastClosingPrice: new BigNumber(3).times(new BigNumber(10).pow(-18)),
          pricePrecision: 18
        }
      ]
    })
  );
});
