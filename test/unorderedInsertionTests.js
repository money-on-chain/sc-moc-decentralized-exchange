const { expect } = require('chai');
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let DEFAULT_ACCOUNT_INDEX;

describe('unordered insertion tests', function() {
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
  };

  contract('Unordered insertion of 10 sell orders', function(accounts) {
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten sell orders are inserted in inverse order', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertSellLimitOrder(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(it + 1),
                5,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN they end up ordered', async function() {
        await Promise.all(
          [...Array(9).keys()].map(async it => {
            const order1 = await dex.getSellOrderAtIndex(base.address, secondary.address, it);
            const order2 = await dex.getSellOrderAtIndex(base.address, secondary.address, it + 1);
            testHelper.gtBig(order2.price, order1.price, 'orders are not ordered,');
          })
        );
      });
    });
  });

  contract('Unordered insertion of 10 buy orders', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten buy orders are inserted in inverse order', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertBuyLimitOrder(
                base.address,
                secondary.address,
                wadify(10),
                pricefy(10 - it),
                5,
                {
                  from: accounts[DEFAULT_ACCOUNT_INDEX]
                }
              )
            ),
          Promise.resolve()
        );
      });
      it('THEN they end up ordered', async function() {
        await Promise.all(
          [...Array(9).keys()].map(async it => {
            const order1 = await dex.getBuyOrderAtIndex(base.address, secondary.address, it);
            const order2 = await dex.getBuyOrderAtIndex(base.address, secondary.address, it + 1);
            testHelper.gtBig(order1.price, order2.price, 'orders are not ordered,');
          })
        );
      });
    });
  });

  contract('Unordered insertion of 10 sell orders but only 5 different prices', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten sell orders are inserted with 5 different prices', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertSellLimitOrder(
                base.address,
                secondary.address,
                wadify(it + 1),
                pricefy((it % 5) + 1),
                5,
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
        const resultPrices = orders.map(it => it.price.toString());
        const expectedPrices = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5].map(it => pricefy(it).toString());
        expect(resultPrices).to.have.ordered.members(
          expectedPrices,
          'orders not match the expected price order'
        );

        const resultAmounts = orders.map(it => it.exchangeableAmount.toString());
        const expectedAmounts = [1, 6, 2, 7, 3, 8, 4, 9, 5, 10].map(it => wadify(it).toString());
        expect(resultAmounts).to.have.ordered.members(
          expectedAmounts,
          'orders not match the expected amount order'
        );
      });
    });
  });

  contract('Unordered insertion of 10 buy orders but only 5 different prices', function(accounts) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(initContractsAndAllowance(accounts));
    describe('GIVEN ten buy orders are inserted with 5 different prices', function() {
      before(async function() {
        await [...Array(10).keys()].reduce(
          (acc, it) =>
            acc.then(() =>
              dex.insertBuyLimitOrder(
                base.address,
                secondary.address,
                wadify(it + 1),
                pricefy(((10 - it) % 5) + 1),
                5,
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
            dex.getBuyOrderAtIndex(base.address, secondary.address, it)
          )
        );

        const resultPrices = orders.map(it => it.price.toString());
        const expectedPrices = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1].map(it => pricefy(it).toString());
        expect(resultPrices).to.have.ordered.members(
          expectedPrices,
          'orders not match the expected price order'
        );
        const resultAmounts = orders.map(it => it.exchangeableAmount.toString());
        const expectedAmounts = [2, 7, 3, 8, 4, 9, 5, 10, 1, 6].map(it => wadify(it).toString());
        expect(resultAmounts).to.have.ordered.members(
          expectedAmounts,
          'orders not match the expected amount order'
        );
      });
    });
  });
});
