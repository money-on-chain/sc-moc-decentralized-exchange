const AddTokenPairChanger = artifacts.require('AddTokenPairChanger');
const MaxBlocksForTickChanger = artifacts.require('MaxBlocksForTickChanger');
const MinBlocksForTickChanger = artifacts.require('MinBlocksForTickChanger');
const ExpectedOrdersForTickChanger = artifacts.require('ExpectedOrdersForTickChanger');
const MinOrderAmountChanger = artifacts.require('MinOrderAmountChanger');
const MaxOrderLifespanChanger = artifacts.require('MaxOrderLifespanChanger');
const BeneficiaryAddressChanger = artifacts.require('BeneficiaryAddressChanger');
const CommissionRateChanger = artifacts.require('CommissionRateChanger');
const CancelationPenaltyRateChanger = artifacts.require('CancelationPenaltyRateChanger');
const ExpirationPenaltyRateChanger = artifacts.require('ExpirationPenaltyRateChanger');
const TokenPairDisabler = artifacts.require('TokenPairDisabler');
const TokenPairEnabler = artifacts.require('TokenPairEnabler');

const addTokenPair = dex => async (baseToken, secondaryToken, priceProvider, precision, price, governor) => {
  const changer = await AddTokenPairChanger.new(
    dex.address,
    [baseToken],
    [secondaryToken],
    [priceProvider],
    [precision],
    [price]
  );
  return governor.executeChange(changer.address);
};

const setMaxBlocksForTick = dex => async (maxBlocksForTick, governor) => {
  const changer = await MaxBlocksForTickChanger.new(dex.address, maxBlocksForTick);
  return governor.executeChange(changer.address);
};
const setMinBlocksForTick = dex => async (minBlocksForTick, governor) => {
  const changer = await MinBlocksForTickChanger.new(dex.address, minBlocksForTick);
  return governor.executeChange(changer.address);
};
const setExpectedOrdersForTick = dex => async (expectedOrdersForTick, governor) => {
  const changer = await ExpectedOrdersForTickChanger.new(dex.address, expectedOrdersForTick);
  return governor.executeChange(changer.address);
};

const setMinOrderAmount = dex => async (minOrderAmount, governor) => {
  const changer = await MinOrderAmountChanger.new(dex.address, minOrderAmount);
  return governor.executeChange(changer.address);
};

const setMaxOrderLifespan = dex => async (maxOrderLifespan, governor) => {
  const changer = await MaxOrderLifespanChanger.new(dex.address, maxOrderLifespan);
  return governor.executeChange(changer.address);
};

const setBeneficiaryAddress = dex => async (beneficiaryAddress, governor) => {
  const changer = await BeneficiaryAddressChanger.new(dex.address, beneficiaryAddress);
  return governor.executeChange(changer.address);
};

const setCommissionRate = dex => async (commissionRate, governor) => {
  const changer = await CommissionRateChanger.new(dex.address, commissionRate);
  return governor.executeChange(changer.address);
};

const setCancelationPenaltyRate = dex => async (cancelationPenaltyRate, governor) => {
  const changer = await CancelationPenaltyRateChanger.new(dex.address, cancelationPenaltyRate);
  return governor.executeChange(changer.address);
};

const setExpirationPenaltyRate = dex => async (expirationPenaltyRate, governor) => {
  const changer = await ExpirationPenaltyRateChanger.new(dex.address, expirationPenaltyRate);
  return governor.executeChange(changer.address);
};
const disableTokenPair = dex => async (baseAddress, secondaryAddress, governor) => {
  const changer = await TokenPairDisabler.new(dex.address, baseAddress, secondaryAddress);
  return governor.executeChange(changer.address);
};
const enableTokenPair = dex => async (baseAddress, secondaryAddress, governor) => {
  const changer = await TokenPairEnabler.new(dex.address, baseAddress, secondaryAddress);
  return governor.executeChange(changer.address);
};

const decorateGovernedSetters = dex =>
  Object.assign({}, dex, {
    addTokenPair: addTokenPair(dex),
    setMaxBlocksForTick: setMaxBlocksForTick(dex),
    setMinBlocksForTick: setMinBlocksForTick(dex),
    setExpectedOrdersForTick: setExpectedOrdersForTick(dex),
    setMinOrderAmount: setMinOrderAmount(dex),
    setBeneficiaryAddress: setBeneficiaryAddress(dex),
    setCommissionRate: setCommissionRate(dex),
    setCancelationPenaltyRate: setCancelationPenaltyRate(dex),
    setExpirationPenaltyRate: setExpirationPenaltyRate(dex),
    setMaxOrderLifespan: setMaxOrderLifespan(dex),
    disableTokenPair: disableTokenPair(dex),
    enableTokenPair: enableTokenPair(dex)
  });

module.exports = {
  decorateGovernedSetters,
  addTokenPair
};
