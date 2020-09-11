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
let priceProvider;

const initializeDex = async function() {
  testHelper = testHelperBuilder();
  ({ wadify, pricefy, DEFAULT_PRICE_PRECISION } = testHelper);
  [dex, base, secondary, governor, priceProvider] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary(),
    testHelper.getGovernor(),
    testHelper.getTokenPriceProviderFake().new()
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
      it('THEN the insertBuyLimitOrder fails', async function() {
        await expectRevert(
          dex.insertBuyLimitOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellMarketOrder fails', async function() {
        await expectRevert(
          dex.insertMarketOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, false, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellLimitOrder fails', async function() {
        await expectRevert(
          dex.insertSellLimitOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertBuyMarketOrder fails', async function() {
        await expectRevert(
          dex.insertMarketOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, true, {
            from: user
          }),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellLimitOrderAfter fails', async function() {
        await expectRevert(
          dex.insertSellLimitOrderAfter(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1),
            5,
            0,
            {
              from: user
            }
          ),
          'Pair has been disabled'
        );
      });

      it('THEN the insertSellMarketOrderAfter fails', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1),
            5,
            0,
            false,
            {
              from: user
            }
          ),
          'Pair has been disabled'
        );
      });

      it('THEN the insertBuyLimitOrderAfter fails', async function() {
        await expectRevert(
          dex.insertBuyLimitOrderAfter(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1),
            5,
            0,
            {
              from: user
            }
          ),
          'Pair has been disabled'
        );
      });

      it('THEN the insertBuyMarketOrderAfter fails', async function() {
        await expectRevert(
          dex.insertMarketOrderAfter(
            base.address,
            secondary.address,
            wadify(1),
            pricefy(1),
            5,
            0,
            true,
            {
              from: user
            }
          ),
          'Pair has been disabled'
        );
      });

      it('THEN an event is emitted', async function() {
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
    // eslint-disable-next-line mocha/no-sibling-hooks
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
      it('THEN the insertBuyLimitOrder succeeds', async function() {
        await dex.insertBuyLimitOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
        testHelper.assertBig(await dex.buyOrdersLength(base.address, secondary.address), 1);
      });

      it('THEN the insertSellLimitOrder succeeds', async function() {
        await dex.insertSellLimitOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
        testHelper.assertBig(await dex.sellOrdersLength(base.address, secondary.address), 1);
      });

      it('THEN the insertSellLimitOrderAfter succeeds', async function() {
        await dex.insertSellLimitOrderAfter(
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

      it('THEN the insertBuyLimitOrderAfter succeeds', async function() {
        await dex.insertBuyLimitOrderAfter(
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

      it('THEN an event is emitted', async function() {
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
      // eslint-disable-next-line mocha/no-sibling-hooks
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
          priceProvider.address,
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
          await dex.insertBuyLimitOrder(
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
            dex.insertBuyLimitOrder(base.address, secondary.address, wadify(1), pricefy(1), 5, {
              from: user
            }),
            'Pair has been disabled'
          );
        });
      });
    }
  );
});
