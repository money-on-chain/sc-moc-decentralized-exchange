const { deployChangePriceProvider, deployPriceProviderFallback } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[5] || 'rskTestnet',
  baseToken: process.argv[2],
  secondaryToken: process.argv[3],
  externalPriceProvider: process.argv[4]
};

if (!input.baseToken || !input.secondaryToken || !input.externalPriceProvider)
  throw new Error(
    'Usage: node changePriceProviderFallback.js <baseToken> <secondaryToken> <externalPriceProvider> [<network>]'
  );
const execute = async () => {
  const newProviderAddress = await deployPriceProviderFallback(
    input.network,
    input.baseToken,
    input.secondaryToken,
    input.externalPriceProvider
  );
  const contractAddress = await deployChangePriceProvider(
    input.network,
    input.baseToken,
    input.secondaryToken,
    newProviderAddress
  );
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
