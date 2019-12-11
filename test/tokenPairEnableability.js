const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

const OwnerBurnableToken = artifacts.require('OwnerBurnableToken');

let base;
let dex;
let secondary;
let governor;
let user;
let testHelper;
let wadify;
let pricefy;
let DEFAULT_PRICE_PRECISION;

const initializeDex = async function() {
  testHelper = testHelperBuilder();
  ({ wadify, pricefy, DEFAULT_PRICE_PRECISION } = testHelper);
  [dex, base, secondary, governor] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary(),
    testHelper.getGovernor()
  ]);
  dex = testHelper.decorateGovernedSetters(dex);
};

describe('token enable/disable tests', function() {
  contract('GIVEN there is a token pair listed', function(accounts) {
    before(async function() {
      await initializeDex();
      user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
      await testHelper.setBalancesAndAllowances({
        dex,
        base,
        secondary,
        userData: null,
        accounts
      });
    });
    describe('WHEN the pair is disabled', function() {
      let result;
      before(async function() {
        result = await dex.disableTokenPair(base.address, secondary.address, governor);
      });
      it('THEN the insertBuyOrder fails', async function() {
        await expectRevert(
          dex.insertBuyOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellOrder fails', async function() {
        await expectRevert(
          dex.insertSellOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellOrderAfter fails', async function() {
        await expectRevert(
          dex.insertSellOrderAfter(base.address, secondary.address, wadify(1), pricefy(1), 5, 0, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertBuyOrderAfter fails', async function() {
        await expectRevert(
          dex.insertBuyOrderAfter(base.address, secondary.address, wadify(1), pricefy(1), 5, 0, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN an event is emmited', async function() {
        const matchEvents = testHelper.findEvents(result, 'TokenPairDisabled', {
          baseToken: base.address,
          secondaryToken: secondary.address
        });
        expect(matchEvents).to.have.lengthOf(1, 'One event expected');
      });
      it('THEN the matchings can still happen', async function() {
        await dex.matchOrders(base.address, secondary.address, 30, {
          from: user
        });
      });
    });
  });

  contract('GIVEN there is 1 token pair listed and it is disabled ', function(accounts) {
    before(async function() {
      await initializeDex();
      user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
      await testHelper.setBalancesAndAllowances({
        dex,
        base,
        secondary,
        userData: null,
        accounts
      });
      await dex.disableTokenPair(base.address, secondary.address, governor);
    });
    describe('WHEN the pair is re-enabled', function() {
      let result;
      before(async function() {
        result = await dex.enableTokenPair(base.address, secondary.address, governor);
      });
      it('THEN the insertBuyOrder succeeds', async function() {
        await dex.insertBuyOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
        testHelper.assertBig(await dex.buyOrdersLength(base.address, secondary.address), 1);
      });

      it('THEN the insertSellOrder succeeds', async function() {
        await dex.insertSellOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
        testHelper.assertBig(await dex.sellOrdersLength(base.address, secondary.address), 1);
      });

      it('THEN the insertSellOrderAfter succeeds', async function() {
        await dex.insertSellOrderAfter(
          base.address,
          secondary.address,
          wadify(1),
          pricefy(0.5),
          5,
          0,
          {
            from: user
          }
        );
        testHelper.assertBig(await dex.sellOrdersLength(base.address, secondary.address), 2);
      });

      it('THEN the insertBuyOrderAfter succeeds', async function() {
        await dex.insertBuyOrderAfter(
          base.address,
          secondary.address,
          wadify(1),
          pricefy(6),
          5,
          0,
          {
            from: user
          }
        );
        testHelper.assertBig(await dex.buyOrdersLength(base.address, secondary.address), 2);
      });

      it('THEN an event is emmited', async function() {
        const matchEvents = testHelper.findEvents(result, 'TokenPairEnabled', {
          baseToken: base.address,
          secondaryToken: secondary.address
        });
        expect(matchEvents).to.have.lengthOf(1, 'One event expected');
      });
    });
  });

  contract(
    'GIVEN there is a token pair listed in which the base is listed against the common base',
    function(accounts) {
      let newBase;
      let newSecondary;
      before(async function() {
        await initializeDex();
        user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
        await testHelper.setBalancesAndAllowances({
          dex,
          base,
          secondary,
          userData: null,
          accounts
        });
        newBase = secondary;
        newSecondary = await OwnerBurnableToken.new();
        await dex.addTokenPair(
          newBase.address,
          newSecondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
      });
      describe('WHEN the intermediate token pair is disabled', function() {
        before(async function() {
          await dex.disableTokenPair(base.address, secondary.address, governor);
        });
        it('THEN the insertions on the last pair succeed', async function() {
          await dex.insertBuyOrder(
            newBase.address,
            newSecondary.address,
            wadify(1),
            pricefy(1),
            5,
            {
              from: user
            }
          );
          testHelper.assertBig(await dex.buyOrdersLength(newBase.address, newSecondary.address), 1);
        });
        it('THEN the insertions on the intermediate pair fails', async function() {
          await expectRevert(
            dex.insertBuyOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
              from: user
            }),
            'Pair has been disabled'
          );
        });
      });
    }
  );
});
