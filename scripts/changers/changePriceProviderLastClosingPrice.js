const {
  deployChangePriceProvider,
  deployPriceProviderLastClosingPrice
} = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: 'rskTestnet',
  baseToken: '0x4EDe91faEE4e26104bFa8cDdb23e6cF480394439',
  secondaryToken: '0xa72f49662748C994D80f5556Bf9cf2E9d33d1474'
};

if (!input.baseToken || !input.secondaryToken)
  throw new Error(
    'Usage: node changePriceProviderLastClosingPrice.js <baseToken> <secondaryToken> [<network>]'
  );
const execute = async () => {
  const newProviderAddress = await deployPriceProviderLastClosingPrice(
    input.network,
    input.baseToken,
    input.secondaryToken
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
