const { expectRevert, expectEvent } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let DEFAULT_PRICE_PRECISION;
let assertNewOrderEvent;

const createTokenPair = async function(
  dex,
  governor,
  priceProvider,
  { base, secondary, lastClosingPrice, pricePrecision }
) {
  await priceProvider.poke(
    pricePrecision ? (10 ** pricePrecision).toString() : DEFAULT_PRICE_PRECISION.toString()
  );
  await dex.addTokenPair(
    base.address,
    secondary.address,
    priceProvider.address,
    pricePrecision ? (10 ** pricePrecision).toString() : DEFAULT_PRICE_PRECISION.toString(),
    lastClosingPrice,
    governor
  );
};

describe('FEATURE: Min amount for order', function() {
  // it's kinda sketchy that these variables are referenced in the test data definitions
  // at the end of the file, but initialized in the before hook for each one of them.
  // but whatever.
  let commonBase;
  let someToken;
  let otherToken;

  let dex;
  let governor;
  let from;

  let testHelper;
  let wadify;
  let pricefy;

  const testValidInsertion = function({
    pair,
    amount,
    shouldFail,
    isBuy,
    minAmount,
    setup,
    setupMessage,
    goesToPendingQueue
  }) {
    return async function() {
      contract('GIVEN a contract with several token pairs', function(accounts) {
        let base;
        let secondary;
        let doInsertLimitOrder;
        let pairAddresses;
        let priceProvider;

        before(async function() {
          // create dex contract and necessary tokens
          testHelper = testHelperBuilder();
          ({ wadify, pricefy, DEFAULT_PRICE_PRECISION, assertNewOrderEvent } = testHelper);
          await testHelper.createContracts({
            owner: accounts[0]
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
          dex = testHelper.decorateGovernedSetters(dex, governor);

          // create two new token pairs
          await createTokenPair(dex, governor, priceProvider, {
            base: commonBase,
            secondary: someToken,
            lastClosingPrice: pricefy(3)
          });
          await createTokenPair(dex, governor, priceProvider, {
            base: someToken,
            secondary: otherToken,
            lastClosingPrice: pricefy(50)
          });
          [base, secondary] = pair();
          pairAddresses = pair().map(it => it.address);
          // set balances and allowances into the given pair
          await testHelper.setBalancesAndAllowances({
            dex,
            base,
            secondary,
            accounts
          });
          from = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];

          // simplify insertion function
          doInsertLimitOrder = async function() {
            return isBuy
              ? dex.insertBuyLimitOrder(...pairAddresses, wadify(amount), pricefy(1), 5, {
                  from
                })
              : dex.insertSellLimitOrder(...pairAddresses, wadify(amount), pricefy(1), 5, {
                  from
                });
          };
        });

        describe(`AND a min amount of ${minAmount} in common base`, function() {
          before(function() {
            return dex.setMinOrderAmount(wadify(minAmount), governor);
          });

          describe(setupMessage, function() {
            before(setup(pair));
            if (shouldFail) {
              it(`WHEN trying to insert an order with amount: ${amount}, THEN it should revert`, async function() {
                return expectRevert(doInsertLimitOrder(), 'Amount too low');
              });
            } else {
              describe(`WHEN inserting an order with amount: ${amount}`, function() {
                let tx;
                before(async function() {
                  tx = await doInsertLimitOrder();
                });

                if (!goesToPendingQueue) {
                  it('THEN an event for the insertion to the orderbook is emmitted', function() {
                    return assertNewOrderEvent({ isBuy }, () => ({
                      tx,
                      baseAddress: base.address,
                      secondaryAddress: secondary.address,
                      MoCDex: testHelper.getMoCDex()
                    }));
                  });
                } else {
                  it('THEN an event for the insertion to the pending queue is emmitted', function() {
                    return expectEvent.inLogs(tx.logs, 'NewOrderAddedToPendingQueue');
                  });
                }
              });
            }
          });
        });
      });
    };
  };

  const goToRunningMatchingStage = pairGetter => async () => {
    const pair = pairGetter().map(it => it.address);
    await dex.insertBuyLimitOrder(...pair, wadify(1), pricefy(1), 5, { from });
    await dex.insertBuyLimitOrder(...pair, wadify(1), pricefy(1), 5, { from });

    await dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from });
    await dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from });
    await dex.matchOrders(...pair, 1);
  };

  // TODO: when the simulation is paginated, we should consider inserting an order
  // during pagination of the simulation vs during the pagination of the matching
  // as different tests, since the simulation generates the emergent price.
  // We should also define wether the validation should be done against the last tick's
  // emergent price or the newly generated one.
  [
    {
      description: 'Minimum order amount is enforced when the pair is receiving orders',
      setup: () => () => {},
      setupMessage: 'AND the pair is receiving orders',
      goesToPendingQueue: false
    },
    {
      description: 'Minimum order amount is enforced when the pair paginating the matching',
      setup: goToRunningMatchingStage,
      setupMessage: 'AND the pair is running the matching',
      goesToPendingQueue: true
    }
  ].forEach(function(scenario) {
    describe(scenario.description, function() {
      describe('RULE: Amounts below the min should revert', function() {
        describe(
          'CASE: order with the common base as its token',
          testValidInsertion({
            ...scenario,
            pair: () => [commonBase, someToken],
            amount: 0.01,
            shouldFail: true,
            isBuy: true,
            minAmount: 1
          })
        );

        describe(
          'CASE: order with a secondary token with direct conversion into the common base',
          testValidInsertion({
            ...scenario,
            pair: () => [commonBase, someToken],
            amount: 0.1,
            shouldFail: true,
            isBuy: false,
            minAmount: 1
          })
        );

        describe(
          'CASE: order with a base other than the common base as its token',
          testValidInsertion({
            ...scenario,
            pair: () => [someToken, otherToken],
            amount: 0.01,
            shouldFail: true,
            isBuy: true,
            minAmount: 2
          })
        );

        describe(
          'CASE: order with a secondary token without direct conversion into the common base',
          testValidInsertion({
            ...scenario,
            pair: () => [someToken, otherToken],
            amount: 0.01,
            shouldFail: true,
            isBuy: false,
            minAmount: 2
          })
        );
      });

      describe('RULE: Amounts above the min should be inserted', function() {
        describe(
          'CASE: order with the common base as its token',
          testValidInsertion({
            ...scenario,
            pair: () => [commonBase, someToken],
            amount: 1.5,
            isBuy: true,
            minAmount: 1
          })
        );

        describe(
          'CASE: amount in a secondary with direct conversion into the common base',
          testValidInsertion({
            ...scenario,
            pair: () => [commonBase, someToken],
            amount: 0.5,
            isBuy: false,
            minAmount: 1
          })
        );

        describe(
          'CASE: amount in some other base',
          testValidInsertion({
            ...scenario,
            pair: () => [someToken, otherToken],
            amount: 1,
            isBuy: true,
            minAmount: 2
          })
        );

        describe(
          'CASE: amount in some secondary without direct conversion into the common base',
          testValidInsertion({
            ...scenario,
            pair: () => [someToken, otherToken],
            amount: 0.05,
            isBuy: false,
            minAmount: 2
          })
        );
      });
      describe(
        'RULE: with min amount 0, every order should enter',
        testValidInsertion({
          ...scenario,
          pair: () => [someToken, otherToken],
          amount: 0.0000001,
          isBuy: false,
          minAmount: 0
        })
      );

      describe(
        'RULE: an order with amount same as min should enter',
        testValidInsertion({
          ...scenario,
          pair: () => [someToken, otherToken],
          amount: 1,
          isBuy: false,
          minAmount: 0.03
        })
      );
    });
  });
});
