const TokenCollateralPeggedPriceProviderFallback = artifacts.require('./V2TokenCollateralPeggedPriceProviderFallback.sol');

const { getConfig, getNetwork, saveConfig } = require('./helper');


module.exports = async callback => {
  try {
    const network = getNetwork(process.argv);
    const configPath = `${__dirname}/configs/${network}_TokenCollateralPriceProvider.json`;
    const config = getConfig(network, configPath);

    // Deploy new implementation
    const TokenCollateralPeggedPriceProvider = await TokenCollateralPeggedPriceProviderFallback.new(
      config.mocV2,
      config.tpAddress,
      config.dex,
      config.TokenCollateralPegged.baseToken,
      config.TokenCollateralPegged.secondaryToken
    );

    // Save implementation address to config file
    console.log(`Price Provider address: ${TokenCollateralPeggedPriceProvider.address}`);
    config.TokenCollateralPegged.PriceProvider = TokenCollateralPeggedPriceProvider.address;
    saveConfig(config, configPath);

  } catch (error) {
    callback(error);
  }

  callback();
};

