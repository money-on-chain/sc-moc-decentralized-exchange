const { changePriceValidity } = require('./dexInteractions');

const input = {
  network: process.argv[4] || 'rskTestnet',
  priceProvider: process.argv[2],
  priceValidity: process.argv[3]
};

if (!input.priceProvider || !input.priceValidity)
  throw new Error(
    'Usage: node changePriceValidity.js <priceProviderFake> <priceValidity> [<network>]'
  );
const execute = async () =>
  changePriceValidity(input.network, input.priceProvider, input.priceValidity === 'true');

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
