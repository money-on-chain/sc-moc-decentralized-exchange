const { deployChangePriceProvider, deployUnityPriceProvider } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[4] || 'rskTestnet',
  baseToken: process.argv[2],
  secondaryToken: process.argv[3]
};

if (!input.baseToken || !input.secondaryToken)
  throw new Error(
    'Usage: node changePriceProviderUnity.js <baseToken> <secondaryToken> [<network>]'
  );

const execute = async () => {
  const newProviderAddress = await deployUnityPriceProvider(input.network);
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
