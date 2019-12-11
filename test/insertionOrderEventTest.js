const { BN, expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Order insertion event tests', function() {
  let from;
  let dex;
  let base;
  let secondary;
  let tx;
  let testHelper;
  let wadify;
  let pricefy;
  let assertNewOrderEvent;

  const initContractsAndAllowance = async accounts => {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, assertNewOrderEvent } = testHelper);
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances({ dex, base, secondary, accounts });
    from = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
  };

  contract('Dex', accounts => {
    describe('WHEN inserting a buy order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        tx = await dex.insertBuyOrder(base.address, secondary.address, wadify(10), pricefy(1), 10, {
          from
        });
      });
      it('THEN an event is emitted for the buy order', function() {
        assertNewOrderEvent({ isBuy: true, expiresInTick: '11' }, () => ({
          tx,
          baseAddress: base.address,
          secondaryAddress: secondary.address,
          MoCDex: testHelper.getMoCDex()
        }));
      });
    });
    describe('AND WHEN inserting a buy order with too much lifespan', function() {
      it('THEN it should revert', function() {
        return expectRevert(
          dex.insertBuyOrder(base.address, secondary.address, wadify(10), pricefy(1), 33, {
            from
          }),
          'Lifespan too high'
        );
      });
    });
    describe('AND WHEN inserting a buy order with 0 price', function() {
      it('THEN it should revert', function() {
        return expectRevert(
          dex.insertBuyOrder(base.address, secondary.address, wadify(10), pricefy(0), 10, {
            from
          }),
          'Price cannot be zero'
        );
      });
    });
  });

  contract('Dex', accounts => {
    describe('WHEN inserting a sell order', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        tx = await dex.insertSellOrder(
          base.address,
          secondary.address,
          wadify(10),
          pricefy(1),
          10,
          {
            from
          }
        );
      });
      it('THEN an event is emitted for the sell Order', function() {
        assertNewOrderEvent({ isBuy: false, expiresInTick: '11' }, () => ({
          tx,
          baseAddress: base.address,
          secondaryAddress: secondary.address,
          MoCDex: testHelper.getMoCDex()
        }));
      });
    });
    describe('AND WHEN inserting a sell order with too much lifespan', function() {
      it('THEN it should revert', function() {
        return expectRevert(
          dex.insertSellOrder(base.address, secondary.address, wadify(10), pricefy(1), 55, {
            from
          }),
          'Lifespan too high'
        );
      });
    });
    describe('AND WHEN inserting a sell order with 0 price', function() {
      it('THEN it should revert', function() {
        return expectRevert(
          dex.insertSellOrder(base.address, secondary.address, wadify(10), pricefy(0), 10, {
            from
          }),
          'Price cannot be zero'
        );
      });
    });
  });

  contract('Dex', accounts => {
    describe('WHEN inserting a sell order after a previous one', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertSellOrder(base.address, secondary.address, wadify(5), pricefy(1), 5, {
          from
        });
        await dex.insertSellOrder(base.address, secondary.address, wadify(5), pricefy(2), 5, {
          from
        });
        tx = await dex.insertSellOrderAfter(
          base.address,
          secondary.address,
          wadify(10),
          pricefy(1),
          5,
          1,
          { from }
        );
      });
      it('THEN the event is emitted', function() {
        assertNewOrderEvent({ id: new BN(3), isBuy: false }, () => ({
          tx,
          baseAddress: base.address,
          secondaryAddress: secondary.address,
          MoCDex: testHelper.getMoCDex()
        }));
      });
    });
  });

  contract('Dex', accounts => {
    describe('GIVEN some previous buy orders', function() {
      before(async function() {
        await initContractsAndAllowance(accounts);
        await dex.insertBuyOrder(base.address, secondary.address, wadify(5), pricefy(1), 5, {
          from
        });
        await dex.insertBuyOrder(base.address, secondary.address, wadify(5), pricefy(2), 5, {
          from
        });
      });
      describe('WHEN inserting a buy order after a previous one', function() {
        it('THEN it should revert', function() {
          return expectRevert(
            dex.insertBuyOrderAfter(
              base.address,
              secondary.address,
              wadify(10),
              pricefy(1.5),
              200,
              2,
              { from }
            ),
            'Lifespan too high'
          );
        });
      });
      describe('AND WHEN inserting a buy order after a previous one', function() {
        before(async function() {
          tx = await dex.insertBuyOrderAfter(
            base.address,
            secondary.address,
            wadify(10),
            pricefy(1.5),
            5,
            2,
            { from }
          );
        });
        it('THEN the event is emitted', function() {
          assertNewOrderEvent({ id: new BN(3), price: 1.5 }, () => ({
            tx,
            baseAddress: base.address,
            secondaryAddress: secondary.address,
            MoCDex: testHelper.getMoCDex()
          }));
        });
      });
    });
  });
});
