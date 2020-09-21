const {
  deployChangePriceProvider,
  deployMocBproBtcPriceProviderFallback
} = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[5] || 'rskTestnet',
  baseToken: process.argv[2],
  secondaryToken: process.argv[3],
  mocState: process.argv[4]
};

if (!input.baseToken || !input.secondaryToken || !input.mocState)
  throw new Error(
    'Usage: node changePriceProviderMocBproBtc.js <baseToken> <secondaryToken> <mocState> [<network>]'
  );

const execute = async () => {
  const newProviderAddress = await deployMocBproBtcPriceProviderFallback(
    input.network,
    input.baseToken,
    input.secondaryToken,
    input.mocState
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
