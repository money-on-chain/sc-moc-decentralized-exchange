const { expectEvent, BN } = require('openzeppelin-test-helpers');
const { expect, use } = require('chai');

const testHelperBuilder = require('./testHelpers/testHelper');

use(require('bn-chai')(BN));

describe('Withdraw commissions tests', function() {
  let dex;
  let commissionManager;
  let base;
  let secondary;
  let beneficiaryAddress;
  let chargedCommission;
  let testHelper;
  let wadify;
  let pricefy;
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy } = testHelper);
    [dex, commissionManager, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getCommissionManager(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    beneficiaryAddress = await commissionManager.beneficiaryAddress();
  });

  const chargeCommissionInBase = async function(accounts) {
    await testHelper.setBalancesAndAllowances({
      accounts
    });
    await dex.insertBuyOrder(base.address, secondary.address, wadify(10), pricefy(2), 5, {
      from: accounts[testHelper.DEFAULT_ACCOUNT_INDEX]
    });
    await dex.cancelBuyOrder(base.address, secondary.address, 1, 0, {
      from: accounts[testHelper.DEFAULT_ACCOUNT_INDEX]
    });
    const commissionCharged = await commissionManager.exchangeCommissions(base.address);
    expect(commissionCharged).to.be.gt.BN(0);
    return commissionCharged;
  };

  const chargeCommissionInSecondary = async function(accounts) {
    await testHelper.setBalancesAndAllowances({
      accounts
    });
    await dex.insertSellOrder(base.address, secondary.address, wadify(10), pricefy(2), 5, {
      from: accounts[testHelper.DEFAULT_ACCOUNT_INDEX]
    });
    await dex.cancelSellOrder(base.address, secondary.address, 1, 0, {
      from: accounts[testHelper.DEFAULT_ACCOUNT_INDEX]
    });

    const commissionCharged = await commissionManager.exchangeCommissions(secondary.address);
    expect(commissionCharged).to.be.gt.BN(0);
    return commissionCharged;
  };

  contract('GIVEN there are commissions charged in base', function(accounts) {
    before(async function() {
      chargedCommission = await chargeCommissionInBase(accounts);
    });
    describe('WHEN someone calls withdrawCommission', function() {
      let receipt;
      let previousBalance;
      before(async function() {
        previousBalance = await base.balanceOf(beneficiaryAddress);
        receipt = await dex.withdrawCommissions(base.address);
      });
      it('THEN the beneficiary got the charged commission sent', async function() {
        testHelper.assertBig(
          await base.balanceOf(beneficiaryAddress),
          chargedCommission.add(previousBalance)
        );
      });
      it('THEN the event is emited', function() {
        return expectEvent.inLogs(receipt.logs, 'CommissionWithdrawn', {
          withdrawnAmount: chargedCommission,
          token: base.address,
          commissionBeneficiary: beneficiaryAddress
        });
      });
    });
  });
  contract('GIVEN there are commissions charged in base', function(accounts) {
    before(async function() {
      chargedCommission = await chargeCommissionInBase(accounts);
    });
    describe('WHEN someone calls withdrawCommission twice', function() {
      let firstReceipt;
      let secondReceipt;

      let previousBalance;
      before(async function() {
        previousBalance = await base.balanceOf(beneficiaryAddress);

        firstReceipt = await dex.withdrawCommissions(base.address);
        secondReceipt = await dex.withdrawCommissions(base.address);
      });
      it('THEN the beneficiary has only the commission charged as balance', async function() {
        testHelper.assertBig(
          await base.balanceOf(beneficiaryAddress),
          chargedCommission.add(previousBalance)
        );
      });
      it('THEN the first event has the commission charged as the amount', function() {
        return expectEvent.inLogs(firstReceipt.logs, 'CommissionWithdrawn', {
          withdrawnAmount: chargedCommission,
          token: base.address,
          commissionBeneficiary: beneficiaryAddress
        });
      });
      it('THEN the second event has 0 as the amount withdrawn', function() {
        return expectEvent.inLogs(secondReceipt.logs, 'CommissionWithdrawn', {
          withdrawnAmount: testHelper.wadify(0),
          token: base.address,
          commissionBeneficiary: beneficiaryAddress
        });
      });
    });
  });
  contract('GIVEN there are commissions charged in secondary', function(accounts) {
    let chargedCommissionSecondary;
    let previousBalance;

    before(async function() {
      previousBalance = await base.balanceOf(beneficiaryAddress);

      chargedCommissionSecondary = await chargeCommissionInSecondary(accounts);
    });
    describe('WHEN someone calls withdrawCommission in base', function() {
      let receipt;
      before(async function() {
        receipt = await dex.withdrawCommissions(base.address);
      });
      it('THEN the beneficiary got 0 tokens', async function() {
        return testHelper.assertBig(await base.balanceOf(beneficiaryAddress), previousBalance);
      });
      it('THEN the event is emited with 0 withdrawn amount', function() {
        return expectEvent.inLogs(receipt.logs, 'CommissionWithdrawn', {
          withdrawnAmount: testHelper.wadify(0),
          token: base.address,
          commissionBeneficiary: beneficiaryAddress
        });
      });
      it('THEN the commissions in secondary are still intact', async function() {
        return testHelper.assertBig(
          await commissionManager.exchangeCommissions(secondary.address),
          chargedCommissionSecondary
        );
      });
    });
  });
});
