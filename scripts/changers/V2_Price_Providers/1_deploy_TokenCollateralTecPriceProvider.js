const TokenCollateralTecPriceProviderFallback = artifacts.require(
  './V2TokenCollateralTecPriceProviderFallback.sol'
);

const { getConfig, getNetwork, saveConfig } = require('./helper');

module.exports = async callback => {
  try {
    const network = getNetwork(process.argv);
    const configPath = `${__dirname}/configs/${network}_TokenCollateralPriceProvider.json`;
    const config = getConfig(network, configPath);

    // Deploy new implementation
    const TokenCollateralTecPriceProvider = await TokenCollateralTecPriceProviderFallback.new(
      config.mocV2,
      config.tpAddress,
      config.dex,
      config.TokenCollateralTec.baseToken,
      config.TokenCollateralTec.secondaryToken
    );

    // Save implementation address to config file
    console.log(`Price Provider address: ${TokenCollateralTecPriceProvider.address}`);
    config.TokenCollateralTec.PriceProvider = TokenCollateralTecPriceProvider.address;
    saveConfig(config, configPath);
  } catch (error) {
    callback(error);
  }

  callback();
};
