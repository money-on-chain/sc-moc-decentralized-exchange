/* eslint-disable no-console */
const TokenCollateralTecPriceProviderFallback = artifacts.require(
  './V2TokenCollateralTecPriceProviderFallback.sol'
);

const BigNumber = require('bignumber.js');
const { getConfig, getNetwork } = require('./helper');

module.exports = async callback => {
  try {
    const network = getNetwork(process.argv);
    const configPath = `${__dirname}/configs/${network}_TokenCollateralPriceProvider.json`;
    const config = getConfig(network, configPath);

    console.log(`Price Provider Address: ${config.TokenCollateralTec.PriceProvider}`);

    // Get value from contract
    const priceProvider = await TokenCollateralTecPriceProviderFallback.at(
      config.TokenCollateralTec.PriceProvider
    );

    const price = await priceProvider.peek();

    const mocPrecision = 10 ** 18;
    const pricePrecision = BigNumber(price[0].toString()).div(mocPrecision);
    console.log(`Price from contract: ${pricePrecision.toString()}`);

    // console.log(`Price from contract: ${PriceFromMedianizer[0].toString()}`);
    console.log(`Valid?: ${price[1].toString()}`);
  } catch (error) {
    callback(error);
  }
  callback();
};
