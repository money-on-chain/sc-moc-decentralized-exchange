const TokenPairEnabler = require('../../build/contracts/TokenPairEnabler.json');
const TokenPairDisabler = require('../../build/contracts/TokenPairDisabler.json');
const BeneficiaryAddressChanger = require('../../build/contracts/BeneficiaryAddressChanger.json');
const CancelationPenaltyRateChanger = require('../../build/contracts/CancelationPenaltyRateChanger.json');
const CommissionRateChanger = require('../../build/contracts/CommissionRateChanger.json');
const ExpectedOrdersForTickChanger = require('../../build/contracts/ExpectedOrdersForTickChanger.json');
const ExpirationPenaltyRateChanger = require('../../build/contracts/ExpirationPenaltyRateChanger.json');
const LastClosingPriceChanger = require('../../build/contracts/LastClosingPriceChanger.json');
const MaxBlocksForTickChanger = require('../../build/contracts/MaxBlocksForTickChanger.json');
const MaxOrderLifespanChanger = require('../../build/contracts/MaxOrderLifespanChanger.json');
const MinBlocksForTickChanger = require('../../build/contracts/MinBlocksForTickChanger.json');
const MinOrderAmountChanger = require('../../build/contracts/MinOrderAmountChanger.json');
const AddTokenPairChanger = require('../../build/contracts/AddTokenPairChanger.json');
const PriceProviderChanger = require('../../build/contracts/PriceProviderChanger.json');
const TokenPriceProviderLastClosingPrice = require('../../build/contracts/TokenPriceProviderLastClosingPrice.json');
const ExternalOraclePriceProviderFallback = require('../../build/contracts/ExternalOraclePriceProviderFallback.json');
const TokenPriceProviderFake = require('../../build/contracts/TokenPriceProviderFake.json');
const MocBproBtcPriceProviderFallback = require('../../build/contracts/MocBproBtcPriceProviderFallback.json');
const MocBproUsdPriceProviderFallback = require('../../build/contracts/MocBproUsdPriceProviderFallback.json');
const UnityPriceProvider = require('../../build/contracts/UnityPriceProvider.json');

const { deployContract, getConfig } = require('./networkHelper');

const deployTokenEnabler = async (network, baseAddress, secondaryAddress) => {
  const config = getConfig(network);
  return deployContract(TokenPairEnabler, network, [config.dex, baseAddress, secondaryAddress]);
};

const deployTokenDisabler = async (network, baseAddress, secondaryAddress) => {
  const config = getConfig(network);
  return deployContract(TokenPairDisabler, network, [config.dex, baseAddress, secondaryAddress]);
};

const deployBeneficiaryAddressChanger = async (network, beneficiaryAddress) => {
  const config = getConfig(network);
  return deployContract(BeneficiaryAddressChanger, network, [
    config.commissionManager,
    beneficiaryAddress
  ]);
};

const deployCancelationPenaltyRateChanger = async (network, cancelationPenaltyRate) => {
  const config = getConfig(network);

  return deployContract(CancelationPenaltyRateChanger, network, [
    config.commissionManager,
    cancelationPenaltyRate
  ]);
};

const deployCommissionRateChanger = async (network, comissionRate) => {
  const config = getConfig(network);

  return deployContract(CommissionRateChanger, network, [config.commissionManager, comissionRate]);
};

const deployExpectedOrdersForTickChanger = async (network, expectedOrdersForTick) => {
  const config = getConfig(network);

  return deployContract(ExpectedOrdersForTickChanger, network, [config.dex, expectedOrdersForTick]);
};

const deployExpirationPenaltyRateChanger = async (network, expirationPenaltyRate) => {
  const config = getConfig(network);
  return deployContract(ExpirationPenaltyRateChanger, network, [
    config.commissionManager,
    expirationPenaltyRate
  ]);
};

const deployLastClosingPriceChanger = async (network, baseToken, secondaryToken, price) => {
  const config = getConfig(network);

  return deployContract(LastClosingPriceChanger, network, [
    config.dex,
    baseToken,
    secondaryToken,
    price
  ]);
};

const deployMaxBlocksForTickChanger = async (network, newMaxBlocksForTick) => {
  const config = getConfig(network);

  return deployContract(MaxBlocksForTickChanger, network, [config.dex, newMaxBlocksForTick]);
};

const deployMaxOrderLifespanChanger = async (network, maxOrderLifespan) => {
  const config = getConfig(network);

  return deployContract(MaxOrderLifespanChanger, network, [config.dex, maxOrderLifespan]);
};

const deployMinBlocksForTickChanger = async (network, newMinBlocksForTick) => {
  const config = getConfig(network);

  return deployContract(MinBlocksForTickChanger, network, [config.dex, newMinBlocksForTick]);
};

const deployMinOrderAmountChanger = async (network, minOrderAmount) => {
  const config = getConfig(network);

  return deployContract(MinOrderAmountChanger, network, [config.dex, minOrderAmount]);
};

const deployAddTokenPairChanger = async (
  network,
  baseTokenAddres,
  secondaryTokenAddress,
  initPrice,
  pricePrecision
) => {
  const config = getConfig(network);
  return deployContract(AddTokenPairChanger, network, [
    config.dex,
    [baseTokenAddres],
    [secondaryTokenAddress],
    [initPrice],
    [pricePrecision]
  ]);
};

const deployPriceProviderFake = async network =>
  deployContract(TokenPriceProviderFake, network, []);

const deployPriceProviderLastClosingPrice = async (
  network,
  baseTokenAddress,
  secondaryTokenAddress
) => {
  const config = getConfig(network);

  return deployContract(TokenPriceProviderLastClosingPrice, network, [
    config.dex,
    baseTokenAddress,
    secondaryTokenAddress
  ]);
};

const deployPriceProviderFallback = async (
  network,
  baseTokenAddress,
  secondaryTokenAddress,
  externalPriceProvider
) => {
  const config = getConfig(network);

  return deployContract(ExternalOraclePriceProviderFallback, network, [
    externalPriceProvider,
    config.dex,
    baseTokenAddress,
    secondaryTokenAddress
  ]);
};

const deployMocStatePriceProvider = priceProviderContract => (
  network,
  baseTokenAddress,
  secondaryTokenAddress,
  mocStateAddress
) => {
  const config = getConfig(network);

  return deployContract(priceProviderContract, network, [
    mocStateAddress,
    config.dex,
    baseTokenAddress,
    secondaryTokenAddress
  ]);
};

const deployMocBproBtcPriceProviderFallback = deployMocStatePriceProvider(
  MocBproBtcPriceProviderFallback
);

const deployMocBproUsdPriceProviderFallback = deployMocStatePriceProvider(
  MocBproUsdPriceProviderFallback
);

const deployUnityPriceProvider = network => deployContract(UnityPriceProvider, network);

const deployChangePriceProvider = (
  network,
  baseTokenAddress,
  secondaryTokenAddress,
  priceProviderAddress
) => {
  const config = getConfig(network);

  return deployContract(PriceProviderChanger, network, [
    config.dex,
    baseTokenAddress,
    secondaryTokenAddress,
    priceProviderAddress
  ]);
};

module.exports = {
  deployTokenDisabler,
  deployTokenEnabler,
  deployBeneficiaryAddressChanger,
  deployCancelationPenaltyRateChanger,
  deployCommissionRateChanger,
  deployExpectedOrdersForTickChanger,
  deployExpirationPenaltyRateChanger,
  deployLastClosingPriceChanger,
  deployMaxBlocksForTickChanger,
  deployMaxOrderLifespanChanger,
  deployMinBlocksForTickChanger,
  deployMinOrderAmountChanger,
  deployAddTokenPairChanger,
  deployChangePriceProvider,
  deployPriceProviderLastClosingPrice,
  deployPriceProviderFallback,
  deployMocBproBtcPriceProviderFallback,
  deployMocBproUsdPriceProviderFallback,
  deployUnityPriceProvider,
  deployPriceProviderFake
};
