const { expectRevert, expectEvent } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let wadify;
let testHelper;
let pricefy;

const ERROR_MSG_SUBTRACTION_OVERFLOW = 'SafeMath: subtraction overflow.';

describe('value is transferred to the exchange contract when inserting orders', function() {
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy } = testHelper);
  });
  let dex;
  let base;
  let secondary;
  let pair;
  const setContracts = async function() {
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    pair = [base.address, secondary.address];
  };

  contract('inserting a buy order: happy path', function([owner, user]) {
    describe('GIVEN the user sets a DOC allowance of 50 on the exchange contract', function() {
      before(async function() {
        await setContracts();
        await base.mint(user, wadify(100), { from: owner });
        await base.approve(dex.address, wadify(50), { from: user });
      });
      it('WHEN the user tries to insert an order with a value of 4', async function() {
        await dex
          .insertBuyLimitOrder(...pair, wadify(4), pricefy(10), 5, { from: user })
          .then(({ tx }) =>
            expectEvent.inTransaction(tx, testHelper.getBaseToken(), 'Transfer', {
              from: user,
              to: dex.address,
              value: wadify(4)
            })
          );
      });
      it('THEN the users balance is reduced in 4', async function() {
        testHelper.assertBigWad(await base.balanceOf(user), 96);
      });
      it('AND the exchanges balance is increased in 4', async function() {
        testHelper.assertBigWad(await base.balanceOf(dex.address), 4);
      });
      it('AND the exchanges allowance is reduced in 4', async function() {
        testHelper.assertBigWad(await base.allowance(user, dex.address), 46);
      });
    });
  });

  contract('Dex', function([owner, user]) {
    describe('inserting a buy order: insufficient allowance', function() {
      describe('GIVEN the user sets a DOC allowance of 50 on the exchange contract', function() {
        before(async function() {
          await setContracts();
          await base.mint(user, wadify(100), { from: owner });
          await base.approve(dex.address, wadify(50), { from: user });
        });
        it('WHEN the user tries to insert an order with a value of 60, THEN it should revert', async function() {
          await expectRevert(
            dex.insertBuyLimitOrder(...pair, wadify(60), pricefy(10), 5, {
              from: user
            }),
            ERROR_MSG_SUBTRACTION_OVERFLOW // The Token throws that error
          );
        });
        it('THEN the users balance is not changed', async function() {
          testHelper.assertBigWad(await base.balanceOf(user), 100);
        });
        it('AND the exchanges allowance is not changed', async function() {
          testHelper.assertBigWad(await base.allowance(user, dex.address), 50);
        });
      });
    });
  });

  contract('Dex', function([owner, user]) {
    describe('inserting a buy order: insufficient balance', function() {
      describe('GIVEN the user sets a DOC allowance of 100 on the exchange contract', function() {
        before(async function() {
          await setContracts();
          await base.mint(user, wadify(10), { from: owner });
          await base.approve(dex.address, wadify(100), { from: user });
        });
        it('WHEN the user tries to insert an order with a value of 20(locking 200), THEN it should revert', async function() {
          await expectRevert(
            dex.insertBuyLimitOrder(...pair, wadify(20), pricefy(10), 5, { from: user }),
            ERROR_MSG_SUBTRACTION_OVERFLOW // The Token throws that error
          );
        });
        it('THEN the users balance is not changed', async function() {
          testHelper.assertBigWad(await base.balanceOf(user), 10);
        });
        it('AND the exchanges allowance is not changed', async function() {
          testHelper.assertBigWad(await base.allowance(user, dex.address), 100);
        });
      });
    });
  });

  contract('Dex', function([owner, user]) {
    describe('inserting a buy order: insufficient balance and allowance', function() {
      before(async function() {
        await setContracts();
        await base.mint(user, wadify(10), { from: owner });
      });
      it('GIVEN the user sets a DOC allowance of 100 on the exchange contract', async function() {
        await base.approve(dex.address, wadify(100), { from: user });
      });
      it('WHEN the user tries to insert an order with a value of 200, THEN it should revert', async function() {
        await expectRevert(
          dex.insertBuyLimitOrder(...pair, wadify(200), pricefy(10), 5, { from: user }),
          ERROR_MSG_SUBTRACTION_OVERFLOW // The Token throws that error
        );
      });
      it('THEN the users balance is not changed', async function() {
        testHelper.assertBigWad(await base.balanceOf(user), 10);
      });
      it('AND the exchanges allowance is not changed', async function() {
        testHelper.assertBigWad(await base.allowance(user, dex.address), 100);
      });
    });
  });

  contract('Dex', function([owner, user]) {
    describe('inserting a sell order: happy path', function() {
      before(async function() {
        await setContracts();
        await secondary.mint(user, wadify(10), { from: owner });
      });
      it('GIVEN the user sets a BPRO allowance of 5 on the exchange contract', async function() {
        await secondary.approve(dex.address, wadify(5), { from: user });
      });
      it('WHEN the user tries to insert an order with a value of 4', async function() {
        await dex
          .insertSellLimitOrder(...pair, wadify(4), pricefy(10), 5, { from: user })
          .then(({ tx }) =>
            expectEvent.inTransaction(tx, testHelper.getSecondaryToken(), 'Transfer', {
              from: user,
              to: dex.address,
              value: wadify(4)
            })
          );
      });
      it('THEN the users balance is reduced in 4', async function() {
        testHelper.assertBigWad(await secondary.balanceOf(user), 6);
      });
      it('AND the exchanges balance is increased in 4', async function() {
        testHelper.assertBigWad(await secondary.balanceOf(dex.address), 4);
      });
      it('AND the exchanges allowance is reduced in 4', async function() {
        testHelper.assertBigWad(await secondary.allowance(user, dex.address), 1);
      });
    });
  });
});
