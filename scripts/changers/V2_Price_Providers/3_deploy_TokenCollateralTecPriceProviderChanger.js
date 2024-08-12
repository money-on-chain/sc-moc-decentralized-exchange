const PriceProviderChanger = artifacts.require('./PriceProviderChanger.sol');

const { getConfig, getNetwork, saveConfig } = require('./helper');

module.exports = async callback => {
  try {
    const network = getNetwork(process.argv);
    const configPath = `${__dirname}/configs/${network}_TokenCollateralPriceProvider.json`;
    const config = getConfig(network, configPath);

    // Deploy new implementation
    const priceProviderChanger = await PriceProviderChanger.new(
      config.dex,
      config.TokenCollateralTec.baseToken,
      config.TokenCollateralTec.secondaryToken,
      config.TokenCollateralTec.PriceProvider
    );

    // Save implementation address to config file
    console.log(`Changer address: ${priceProviderChanger.address}`);
    config.TokenCollateralTec.Changer = priceProviderChanger.address;
    saveConfig(config, configPath);
  } catch (error) {
    callback(error);
  }

  callback();
};
