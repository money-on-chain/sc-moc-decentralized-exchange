const testHelperBuilder = require('./testHelpers/testHelper');

describe('specific combined order insertion tests', function() {
  let dex;
  let wadify;
  let pricefy;
  let DEFAULT_ACCOUNT_INDEX;
  let testHelper;
  let from;
  let pair;
  const lifespan = 5;
  const initContractsAndAllowance = accounts => async () => {
    testHelper = testHelperBuilder();
    await testHelper.createContracts({
      owner: accounts[0],
      useFakeDex: true, // We need Fake to access orders at position
      tokenPair: {}, // Will add the default base and secondary pair
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1
    });
    ({ wadify, pricefy, DEFAULT_ACCOUNT_INDEX } = testHelper);
    let base;
    let secondary;
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = await testHelper.decorateGetOrderAtIndex(dex);
    pair = [base.address, secondary.address];
    from = accounts[DEFAULT_ACCOUNT_INDEX];
  };

  contract(
    'insertion of 1 buy market order in order 0 in an orderbook with a limit order',
    function(accounts) {
      before(initContractsAndAllowance(accounts));
      describe('GIVEN a buy orderbook with 1 limit order', function() {
        before(function() {
          return dex.insertBuyLimitOrder(...pair, wadify(2), pricefy(1.1), lifespan, {
            from
          });
        });
        describe('WHEN inserting a buy market order first in the orderbook', function() {
          before(function() {
            return dex.insertMarketOrderAfter(
              pair[0],
              pair[1],
              wadify(2),
              pricefy(1.1),
              0,
              lifespan,
              true,
              {
                from
              }
            );
          });
          it('THEN the buy orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(
              await dex.buyOrdersLength(...pair),
              2,
              'buy market orders length incorrect'
            );
          });
        });
      });
    }
  );

  contract(
    'insertion of 1 buy limit order in order 0 in an orderbook with a market order',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN a buy orderbook with 1 market order', function() {
        before(function() {
          return dex.insertMarketOrder(...pair, wadify(2), pricefy(1.1), lifespan, true, {
            from
          });
        });
        describe('WHEN inserting a buy market order first in the orderbook', function() {
          before(function() {
            return dex.insertBuyLimitOrderAfter(
              pair[0],
              pair[1],
              wadify(2),
              pricefy(1.1),
              lifespan,
              0,
              {
                from
              }
            );
          });
          it('THEN the buy orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(
              await dex.buyOrdersLength(...pair),
              2,
              'buy market orders length incorrect'
            );
          });
        });
      });
    }
  );

  contract(
    'insertion of 1 sell market order in order 0 in an orderbook with a limit order',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN a sell orderbook with 1 limit order', function() {
        before(function() {
          return dex.insertSellLimitOrder(...pair, wadify(2), pricefy(1.1), lifespan, {
            from
          });
        });
        describe('WHEN inserting a sell market order first in the orderbook', function() {
          before(function() {
            return dex.insertMarketOrderAfter(
              pair[0],
              pair[1],
              wadify(2),
              pricefy(1.1),
              0,
              lifespan,
              false,
              {
                from
              }
            );
          });
          it('THEN the sell orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(
              await dex.sellOrdersLength(...pair),
              2,
              'sell market orders length incorrect'
            );
          });
        });
      });
    }
  );

  contract(
    'insertion of 1 sell limit order in order 0 in an orderbook with a market order',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN a sell orderbook with 1 market order', function() {
        before(function() {
          return dex.insertMarketOrder(...pair, wadify(2), pricefy(1.1), lifespan, false, {
            from
          });
        });
        describe('WHEN inserting a sell market order first in the orderbook', function() {
          before(function() {
            return dex.insertSellLimitOrderAfter(
              pair[0],
              pair[1],
              wadify(2),
              pricefy(1.1),
              lifespan,
              0,
              {
                from
              }
            );
          });
          it('THEN the sell orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(
              await dex.sellOrdersLength(...pair),
              2,
              'sell market orders length incorrect'
            );
          });
        });
      });
    }
  );

  contract(
    'insertion of 1 sell limit order in order 0, without hint, in an orderbook with a market order',
    function(accounts) {
      // eslint-disable-next-line mocha/no-sibling-hooks
      before(initContractsAndAllowance(accounts));
      describe('GIVEN a sell orderbook with one market order', function() {
        before(function() {
          return dex.insertMarketOrder(...pair, wadify(2), pricefy(1.1), lifespan, false, {
            from
          });
        });
        describe('WHEN inserting a sell market order first in the orderbook', function() {
          before(async function() {
            await testHelper.assertBig(
              await dex.sellOrdersLength(...pair),
              1,
              'sell market orders length incorrect'
            );
            return dex.insertSellLimitOrder(...pair, wadify(2), pricefy(1.1), lifespan, {
              from
            });
          });
          it('THEN the sell orderbook length is updated accordingly', async function() {
            return testHelper.assertBig(
              await dex.sellOrdersLength(...pair),
              2,
              'sell market orders length incorrect'
            );
          });
        });
      });
    }
  );
});
