/* eslint-disable mocha/no-setup-in-describe */
/* eslint-disable mocha/no-sibling-hooks */
const { expectRevert } = require("openzeppelin-test-helpers");
const testHelperBuilder = require("./testHelpers/testHelper");

const MinBlocksForTickChanger = artifacts.require("MinBlocksForTickChanger");
const MaxBlocksForTickChanger = artifacts.require("MaxBlocksForTickChanger");
const ExpectedOrdersForTickChanger = artifacts.require(
  "ExpectedOrdersForTickChanger"
);
const LastClosingPriceChanger = artifacts.require("LastClosingPriceChanger");
const MinOrderAmountChanger = artifacts.require("MinOrderAmountChanger");
const MaxOrderLifespanChanger = artifacts.require("MaxOrderLifespanChanger");
const BeneficiaryAddressChanger = artifacts.require(
  "BeneficiaryAddressChanger"
);
const CommissionRateChanger = artifacts.require("CommissionRateChanger");
const CancelationPenaltyRateChanger = artifacts.require(
  "CancelationPenaltyRateChanger"
);
const ExpirationPenaltyRateChanger = artifacts.require(
  "ExpirationPenaltyRateChanger"
);
const TokenPairDisabler = artifacts.require("TokenPairDisabler");
const TokenPairEnabler = artifacts.require("TokenPairEnabler");
const EMAPriceChanger = artifacts.require("EMAPriceChanger");
const SmoothingFactorChanger = artifacts.require("SmoothingFactorChanger");

let testHelper;

const ANY_ADDRESS = "0x959a3373f28b83051f1a98b035954a08d8c3fbe9";
describe("Governed functions tests", function() {
  let dex;
  let commissionManager;
  let base;
  let secondary;
  let governor;
  before(async function() {
    testHelper = testHelperBuilder();
    [dex, commissionManager, base, secondary, governor] = await Promise.all([
      testHelper.getDex(),
      testHelper.getCommissionManager(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getGovernor()
    ]);
  });

  const testGoverned = function({
    action,
    functionName,
    getParams,
    then,
    getChanger,
    getContract,
    preconditions = "all preconditions are met",
    fulfillPreconditions
  }) {
    return contract(`RULE: only through governance can ${action}`, function([
      owner,
      account
    ]) {
      let contract;
      before(async function() {
        contract = getContract();
      });
      it(`GIVEN ${preconditions}`, function() {
        if (fulfillPreconditions) fulfillPreconditions();
      });
      it(`GIVEN that reverts calling ${functionName} with a normal account`, async function() {
        await expectRevert(
          contract[functionName](...getParams(), { from: account, gas: 100e6 }),
          "not_authorized_changer"
        );
      });
      it(`AND that reverts calling ${functionName} with the owner account too`, async function() {
        await expectRevert(
          contract[functionName](...getParams(), { from: owner, gas: 6e6 }),
          "not_authorized_changer"
        );
      });
      if (getChanger) {
        it("WHEN calling again but through governance account", async function() {
          const changer = await getChanger();
          await governor.executeChange(changer.address);
        });
        if (then) then();
      }
    });
  };

  testGoverned({
    action: "set the expected orders for tick",
    functionName: "setExpectedOrdersForTick",
    getParams: () => [5],
    getContract: () => dex,
    then: () =>
      it("THEN the expected orders for tick has changed", async function() {
        const { expectedOrdersForTick } = await dex.tickConfig();
        testHelper.assertBig(
          expectedOrdersForTick,
          5,
          "Expected orders for tick"
        );
      }),
    getChanger: () => ExpectedOrdersForTickChanger.new(dex.address, 5)
  });

  testGoverned({
    action: "set the max blocks for tick",
    functionName: "setMaxBlocksForTick",
    getParams: () => [200],
    getContract: () => dex,
    then: () =>
      it("THEN the max blocks for tick has changed", async function() {
        const { maxBlocksForTick } = await dex.tickConfig();
        testHelper.assertBig(maxBlocksForTick, 200, "max blocks for tick");
      }),
    getChanger: () => MaxBlocksForTickChanger.new(dex.address, 200)
  });

  testGoverned({
    action: "set the min blocks for tick",
    functionName: "setMinBlocksForTick",
    getParams: () => [5],
    getContract: () => dex,
    then: () =>
      it("THEN the min blocks for tick has changed", async function() {
        const { minBlocksForTick } = await dex.tickConfig();
        testHelper.assertBig(minBlocksForTick, 5, "min blocks for tick");
      }),
    getChanger: () => MinBlocksForTickChanger.new(dex.address, 5)
  });

  testGoverned({
    action: "set the last closing price for an existing token pair",
    functionName: "setLastClosingPrice",
    getParams: () => [base.address, secondary.address, 17],
    getContract: () => dex,
    then: () =>
      it("THEN the last closing price for the pair has changed", async function() {
        const { lastClosingPrice } = await dex.getTokenPairStatus.call(
          base.address,
          secondary.address
        );
        testHelper.assertBig(lastClosingPrice, 17, "Last closing price");
      }),
    getChanger: () =>
      LastClosingPriceChanger.new(
        dex.address,
        base.address,
        secondary.address,
        17
      )
  });

  testGoverned({
    action: "set the minimum order amount",
    functionName: "setMinOrderAmount",
    getParams: () => [testHelper.wadify(2)],
    getContract: () => dex,
    then: () =>
      it("THEN the minimum order amount has changed", async function() {
        const minOrderAmount = await dex.minOrderAmount();
        testHelper.assertBigWad(minOrderAmount, 2, "Min order amount");
      }),
    getChanger: () =>
      MinOrderAmountChanger.new(dex.address, testHelper.wadify(2))
  });

  testGoverned({
    action: "set the maximum order lifespan",
    functionName: "setMaxOrderLifespan",
    getParams: () => [9],
    getContract: () => dex,
    then: () =>
      it("THEN the max order lifespan has changed", async function() {
        const maxOrderLifespan = await dex.maxOrderLifespan();
        testHelper.assertBig(maxOrderLifespan, 9, "Max order lifespan");
      }),
    getChanger: () => MaxOrderLifespanChanger.new(dex.address, 9)
  });

  testGoverned({
    action: "set the beneficiary address",
    functionName: "setBeneficiaryAddress",
    getContract: () => commissionManager,
    getParams: () => [ANY_ADDRESS],
    getChanger: () =>
      BeneficiaryAddressChanger.new(commissionManager.address, ANY_ADDRESS),
    then: () =>
      it("THEN the address of the beneficiary has changed", async function() {
        const beneficiaryAddress = await commissionManager.beneficiaryAddress();
        testHelper.assertAddresses(
          ANY_ADDRESS,
          beneficiaryAddress.toLowerCase(),
          "Address of the beneficiary"
        );
      })
  });

  testGoverned({
    action: "set the commission rate",
    functionName: "setCommissionRate",
    getContract: () => commissionManager,
    getParams: () => [testHelper.wadify(0.012)],
    then: () =>
      it("THEN the commission rate has changed", async function() {
        const commissionRate = await commissionManager.commissionRate();
        testHelper.assertBigWad(commissionRate, 0.012, "Commission rate");
      }),
    getChanger: () =>
      CommissionRateChanger.new(
        commissionManager.address,
        testHelper.wadify(0.012)
      )
  });

  testGoverned({
    action: "set the cancelation penalty rate",
    functionName: "setCancelationPenaltyRate",
    getContract: () => commissionManager,
    getParams: () => [testHelper.wadify(0.225)],
    then: () =>
      it("THEN the cancelation penalty rate has changed", async function() {
        const cancelationPenaltyRate = await commissionManager.cancelationPenaltyRate();
        testHelper.assertBigWad(
          cancelationPenaltyRate,
          0.225,
          "Cancelation penalty rate"
        );
      }),
    getChanger: () =>
      CancelationPenaltyRateChanger.new(
        commissionManager.address,
        testHelper.wadify(0.225)
      )
  });

  testGoverned({
    action: "set the expiration penalty rate",
    functionName: "setExpirationPenaltyRate",
    getContract: () => commissionManager,
    getParams: () => [testHelper.wadify(0.75)],
    then: () =>
      it("THEN the expiration penalty rate has changed", async function() {
        const expirationPenaltyRate = await commissionManager.expirationPenaltyRate();
        testHelper.assertBigWad(
          expirationPenaltyRate,
          0.75,
          "Expiration penalty rate"
        );
      }),
    getChanger: () =>
      ExpirationPenaltyRateChanger.new(
        commissionManager.address,
        testHelper.wadify(0.75)
      )
  });

  testGoverned({
    action: "disable a token pair",
    functionName: "disableTokenPair",
    getParams: () => [base.address, secondary.address],
    then: () =>
      it("THEN the token pair is disabled", async function() {
        const tokenPairStatus = await dex.getTokenPairStatus(
          base.address,
          secondary.address
        );
        // eslint-disable-next-line no-unused-expressions
        expect(tokenPairStatus.disabled).to.be.true;
      }),
    getContract: () => dex,
    getChanger: () =>
      TokenPairDisabler.new(dex.address, base.address, secondary.address)
  });

  testGoverned({
    action: "enable a token pair",
    functionName: "enableTokenPair",
    getParams: () => [base.address, secondary.address],
    then: () =>
      it("THEN the token pair is not disabled anymore", async function() {
        const tokenPairStatus = await dex.getTokenPairStatus(
          base.address,
          secondary.address
        );
        // eslint-disable-next-line no-unused-expressions
        expect(tokenPairStatus.disabled).to.be.false;
      }),
    getContract: () => dex,
    getChanger: () =>
      TokenPairEnabler.new(dex.address, base.address, secondary.address),
    preconditions: "the pair is disabled",
    fulfillPreconditions: async () => {
      const changer = await TokenPairDisabler.new(
        dex.address,
        base.address,
        secondary.address
      );
      await governor.executeChange(changer.address);
    }
  });

  testGoverned({
    action: "setting ema price",
    functionName: "setTokenPairEMAPrice",
    getParams: () => [base.address, secondary.address, testHelper.wadify(3)],
    then: () =>
      it("THEN the token pair shold have a different EMAPrice", async function() {
        const tokenPairStatus = await dex.getTokenPairStatus(
          base.address,
          secondary.address
        );
        // eslint-disable-next-line no-unused-expressions
        testHelper.assertBigWad(tokenPairStatus.EMAPrice, 3, "EMA Price");
      }),
    getContract: () => dex,
    getChanger: () =>
      EMAPriceChanger.new(
        dex.address,
        base.address,
        secondary.address,
        testHelper.wadify(3)
      )
  });

  testGoverned({
    action: "setting smoothing factor",
    functionName: "setTokenPairSmoothingFactor",
    getParams: () => [base.address, secondary.address, testHelper.wadify(0.72)],
    then: () =>
      it("THEN the token pair shold have a different smoothing factor", async function() {
        const tokenPairStatus = await dex.getTokenPairStatus(
          base.address,
          secondary.address
        );
        // eslint-disable-next-line no-unused-expressions
        testHelper.assertBigWad(
          tokenPairStatus.smoothingFactor,
          0.72,
          "Smoothing factor"
        );
      }),
    getContract: () => dex,
    getChanger: () =>
      SmoothingFactorChanger.new(
        dex.address,
        base.address,
        secondary.address,
        testHelper.wadify(0.72)
      )
  });
});
