/* eslint-disable mocha/no-async-describe */
/* eslint-disable mocha/no-identical-title */

const { expectEvent, BN } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let testHelper;
let wadify;
let pricefy;
let assertBalanceWad;
let assertBalance;

describe('value is transferred to the users when matching', function() {
  let dex;
  let base;
  let secondary;
  const initContractsAndAllowance = (userData, accounts) => async () => {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, assertBalanceWad, assertBalance } = testHelper);
    await testHelper.createContracts({
      owner: accounts[0],
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1,
      tokenPair: {}
    });
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ userData, accounts });
  };

  contract('matching orders 1v1, price 1, no change, no surplus', function(accounts) {
    const [, buyer, seller] = accounts;
    let tx;
    before(
      initContractsAndAllowance(
        {
          '1': {
            baseAllowance: 1,
            baseBalance: 1
          },
          '2': {
            secondaryAllowance: 1,
            secondaryBalance: 1
          }
        },
        accounts
      )
    );
    it('GIVEN there are buy and sell orders at price 1', async function() {
      await dex.insertBuyOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
        from: buyer
      });
      await dex.insertSellOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
        from: seller
      });
    });
    it('AND the exchange contract has balance in both tokens', async function() {
      return Promise.all([
        assertBalanceWad(base, dex.address, 1),
        assertBalanceWad(secondary, dex.address, 1)
      ]);
    });
    it('AND the balance was locked from the users', async function() {
      return Promise.all([
        assertBalanceWad(base, buyer, 0),
        assertBalanceWad(secondary, seller, 0)
      ]);
    });
    it('WHEN matching orders', async function() {
      ({ tx } = await dex.matchOrders(
        base.address,
        secondary.address,
        testHelper.DEFAULT_STEPS_FOR_MATCHING
      ));
    });
    it('THEN the exchange contract has no balance in both tokens', async function() {
      return Promise.all([
        assertBalanceWad(base, dex.address, 0),
        assertBalanceWad(secondary, dex.address, 0)
      ]);
    });
    it('AND the seller received base', async function() {
      return Promise.all([
        assertBalanceWad(base, seller, 1),
        assertBalanceWad(secondary, seller, 0),
        expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
          from: dex.address,
          to: seller,
          value: wadify(1)
        })
      ]);
    });
    it('AND the buyer received secondary', async function() {
      return Promise.all([
        assertBalanceWad(base, buyer, 0),
        assertBalanceWad(secondary, buyer, 1),
        expectEvent.inTransaction(tx, testHelper.getSecondaryToken(), 'Transfer', {
          from: dex.address,
          to: buyer,
          value: wadify(1)
        })
      ]);
    });
  });

  contract('matching orders 1v1, price difference, some change, some surplus', function(accounts) {
    const [, buyer, seller] = accounts;
    let tx;
    before(
      initContractsAndAllowance(
        {
          '1': {
            baseAllowance: 2,
            baseBalance: 2
          },
          '2': {
            secondaryAllowance: 1,
            secondaryBalance: 1
          }
        },
        accounts
      )
    );
    it('GIVEN there are buy and sell orders at price 1, 2', async function() {
      await dex.insertBuyOrder(base.address, secondary.address, wadify(2), pricefy(2), 5, {
        from: buyer
      }); // buyer intent: 1
      await dex.insertSellOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
        from: seller
      });
    });
    it('AND the exchange contract has balance in both tokens', async function() {
      return Promise.all([
        assertBalanceWad(base, dex.address, 2),
        assertBalanceWad(secondary, dex.address, 1)
      ]);
    });
    it('AND the balance was locked from the users', async function() {
      return Promise.all([
        assertBalanceWad(base, buyer, 0),
        assertBalanceWad(secondary, seller, 0)
      ]);
    });
    it('WHEN matching orders', async function() {
      ({ tx } = await dex.matchOrders(
        base.address,
        secondary.address,
        testHelper.DEFAULT_STEPS_FOR_MATCHING
      ));
    });
    it('THEN the exchange contract has no balance in both tokens', async function() {
      return Promise.all([
        assertBalanceWad(base, dex.address, 0),
        assertBalanceWad(secondary, dex.address, 0)
      ]);
    });
    it('AND the seller received more base than they expected', async function() {
      return Promise.all([
        assertBalanceWad(base, seller, 1.5),
        assertBalanceWad(secondary, seller, 0),
        expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
          from: dex.address,
          to: seller,
          value: wadify(1.5)
        })
      ]);
    });
    it('AND the buyer received secondary, and some change in base', async function() {
      return Promise.all([
        assertBalanceWad(base, buyer, 0.5),
        assertBalanceWad(secondary, buyer, 1),
        expectEvent.inTransaction(tx, testHelper.getSecondaryToken(), 'Transfer', {
          from: dex.address,
          to: buyer,
          value: wadify(1)
        }),
        expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
          from: dex.address,
          to: buyer,
          value: wadify(0.5)
        })
      ]);
    });
  });

  contract(
    'matching orders 1v1, price difference, truncation-worthy prices, some change, some surplus',
    async function(accounts) {
      let tx;
      const [, buyer, seller] = accounts;
      before(
        initContractsAndAllowance(
          {
            '1': {
              baseAllowance: 10,
              baseBalance: 10,
              shouldWadify: false // We want the minimum amount
            },
            '2': {
              secondaryAllowance: 1,
              secondaryBalance: 1
            }
          },
          accounts
        )
      );
      it('GIVEN there are buy and sell orders at the 10x the absolute minimum price and the absolute minimum price, respectively', async function() {
        await dex.insertBuyOrder(base.address, secondary.address, new BN(10), new BN(10), 5, {
          from: buyer
        });
        // buyer intent: 1 entire token ,
        // assuming the price has a precision equal to the token precision;
        // more precisely the intent is 1 price_precision
        await dex.insertSellOrder(base.address, secondary.address, wadify(1), new BN(1), 5, {
          from: seller
        });
      });
      it('AND the exchange contract has balance in both tokens', async function() {
        return Promise.all([
          assertBalance(base, dex.address, 10),
          assertBalanceWad(secondary, dex.address, 1)
        ]);
      });
      it('AND the balance was locked from the users', async function() {
        return Promise.all([
          assertBalanceWad(base, buyer, 0),
          assertBalanceWad(secondary, seller, 0)
        ]);
      });
      it('WHEN matching orders', async function() {
        ({ tx } = await dex.matchOrders(
          base.address,
          secondary.address,
          testHelper.DEFAULT_STEPS_FOR_MATCHING
        ));
      });
      it('THEN the exchange contract has no balance in both tokens', async function() {
        return Promise.all([
          assertBalanceWad(base, dex.address, 0),
          assertBalanceWad(secondary, dex.address, 0)
        ]);
      });
      it('AND the seller received more base than they expected', async function() {
        return Promise.all([
          assertBalance(base, seller, new BN(5)),
          assertBalanceWad(secondary, seller, 0),
          expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
            from: dex.address,
            to: seller,
            value: new BN(5)
          })
        ]);
      });
      it('AND the buyer received secondary, and some change in base', async function() {
        return Promise.all([
          assertBalance(base, buyer, new BN(5)),
          assertBalanceWad(secondary, buyer, 1),
          expectEvent.inTransaction(tx, testHelper.getSecondaryToken(), 'Transfer', {
            from: dex.address,
            to: buyer,
            value: wadify(1)
          }),
          expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
            from: dex.address,
            to: buyer,
            value: new BN(5)
          })
        ]);
      });
    }
  );

  contract(
    'full match, an order left in orderbook. The contract has some balance left.',
    async function(accounts) {
      let tx;
      const [, buyer, seller] = accounts;
      before(
        initContractsAndAllowance(
          {
            '1': {
              baseAllowance: 4,
              baseBalance: 4
            },
            '2': {
              secondaryAllowance: 1,
              secondaryBalance: 1
            }
          },
          accounts
        )
      );
      it('GIVEN there are two buy orders, one sell order', async function() {
        await dex.insertBuyOrder(base.address, secondary.address, wadify(2), pricefy(2), 5, {
          from: buyer
        }); // buyer intent: 1
        await dex.insertBuyOrder(base.address, secondary.address, wadify(2), pricefy(2), 5, {
          from: buyer
        }); // buyer intent: 1
        await dex.insertSellOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: seller
        });
      });
      it('AND the exchange contract has balance in both tokens', async function() {
        return Promise.all([
          assertBalanceWad(base, dex.address, 4),
          assertBalanceWad(secondary, dex.address, 1)
        ]);
      });
      it('AND the balance was locked from the users', async function() {
        return Promise.all([
          assertBalanceWad(base, buyer, 0),
          assertBalanceWad(secondary, seller, 0)
        ]);
      });
      it('WHEN matching orders', async function() {
        ({ tx } = await dex.matchOrders(
          base.address,
          secondary.address,
          testHelper.DEFAULT_STEPS_FOR_MATCHING
        ));
      });
      it('THEN there is an unmatched buy order', async function() {
        testHelper.assertBig(await dex.buyOrdersLength(base.address, secondary.address), 1);
      });
      it('AND the exchange contract still holds some base', async function() {
        return Promise.all([
          assertBalanceWad(base, dex.address, 2),
          assertBalanceWad(secondary, dex.address, 0)
        ]);
      });
      it('AND the seller received more base than they expected', async function() {
        return Promise.all([
          assertBalanceWad(base, seller, 1.5),
          assertBalanceWad(secondary, seller, 0),
          expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
            from: dex.address,
            to: seller,
            value: wadify(1.5)
          })
        ]);
      });
      it('AND the buyer received secondary, and some change in base', async function() {
        return Promise.all([
          assertBalanceWad(secondary, buyer, 1),
          assertBalanceWad(base, buyer, 0.5),
          expectEvent.inTransaction(tx, testHelper.getSecondaryToken(), 'Transfer', {
            from: dex.address,
            to: buyer,
            value: wadify(1)
          }),
          expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
            from: dex.address,
            to: buyer,
            value: wadify(0.5)
          })
        ]);
      });
    }
  );
});
