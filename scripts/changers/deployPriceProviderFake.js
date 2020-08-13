const { deployPriceProviderFake } = require('./deployContracts');

const input = {
  network: process.argv[2] || 'rskTestnet'
};
const execute = async () => deployPriceProviderFake(input.network);

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
