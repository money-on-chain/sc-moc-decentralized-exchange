const { changePrice } = require('./dexInteractions');

const input = {
  network: process.argv[4] || 'rskTestnet',
  priceProvider: process.argv[2],
  price: process.argv[3]
};

if (!input.priceProvider || !input.price)
  throw new Error('Usage: node changePrice.js <priceProviderFake> <price> [<network>]');
const execute = async () => changePrice(input.network, input.priceProvider, input.price);

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
