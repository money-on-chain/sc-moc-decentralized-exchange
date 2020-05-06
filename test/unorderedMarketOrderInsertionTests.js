const { expect } = require('chai');
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;
let INSERT_FIRST;
const LIFESPAN = 5;

describe('Unordered market order insertion tests', function() {
  let dex;
  let base;
  let secondary;
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
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = await testHelper.decorateGetOrderAtIndex(dex);
    INSERT_FIRST = await dex.INSERT_FIRST.call();
  };

  contract('Unordered insertion of 10 sell orders', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten sell orders are inserted in inverse order', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertMarketOrderAfter(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(it + 0.1),
                INSERT_FIRST,
                LIFESPAN,
                false,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN sell orders end up ordered', async function() {
        await Promise.all(
          [...Array(9).keys()].map(async it => {
            const order1 = await dex.getSellOrderAtIndex(base.address, secondary.address, it);
            const order2 = await dex.getSellOrderAtIndex(base.address, secondary.address, it + 1);
            testHelper.gtBig(
              order2.multiplyFactor,
              order1.multiplyFactor,
              'orders are not ordered,'
            );
          })
        );
      });
    });
  });

  contract('Unordered insertion of 10 buy orders', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten buy orders are inserted in inverse order', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertMarketOrderAfter(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(2 - it / 10),
                INSERT_FIRST,
                LIFESPAN,
                true,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN the buy orders end up ordered', async function() {
        await Promise.all(
          [...Array(9).keys()].map(async it => {
            const order1 = await dex.getBuyOrderAtIndex(base.address, secondary.address, it);
            const order2 = await dex.getBuyOrderAtIndex(base.address, secondary.address, it + 1);
            testHelper.gtBig(
              order1.multiplyFactor,
              order2.multiplyFactor,
              'market orders are not ordered,'
            );
          })
        );
      });
    });
  });

  contract('Unordered insertion of 10 sell orders but only 5 different prices', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten sell orders are inserted with 5 different prices', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertMarketOrderAfter(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(1 + ((it % 5) + 1) / 10),
                INSERT_FIRST,
                LIFESPAN,
                false,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN they end up ordered', async function() {
        const orders = await Promise.all(
          [...Array(10).keys()].map(it =>
            dex.getSellOrderAtIndex(base.address, secondary.address, it)
          )
        );
        const resultMultiplyFactors = orders.map(it => it.multiplyFactor.toString());
        const expectedMultiplyFactors = [1.1, 1.1, 1.2, 1.2, 1.3, 1.3, 1.4, 1.4, 1.5, 1.5].map(it =>
          pricefy(it).toString()
        );
        expect(resultMultiplyFactors).to.have.ordered.members(
          expectedMultiplyFactors,
          'market orders not match the expected multiplyFactors'
        );
      });
    });
  });

  contract('Unordered insertion of 10 buy orders but only 5 different prices', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten buy orders are inserted with 5 different prices', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertMarketOrderAfter(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(1 + (((10 - it) % 5) + 1) / 10),
                INSERT_FIRST,
                LIFESPAN,
                true,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN buy market orders end up ordered', async function() {
        const orders = await Promise.all(
          [...Array(10).keys()].map(it =>
            dex.getBuyOrderAtIndex(base.address, secondary.address, it)
          )
        );

        const resultPrices = orders.map(it => it.multiplyFactor.toString());
        const expectedPrices = [1.5, 1.5, 1.4, 1.4, 1.3, 1.3, 1.2, 1.2, 1.1, 1.1].map(it =>
          pricefy(it).toString()
        );
        expect(resultPrices).to.have.ordered.members(
          expectedPrices,
          'buy market orders not match the expected multiply factor'
        );
      });
    });
  });
});
