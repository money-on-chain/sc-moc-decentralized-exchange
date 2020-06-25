const { deployPriceProviderFake } = require('./deployContracts');

const input = {
  network: process.argv[2] || 'rskTestnet'
};

const execute = async () => {
  console.log('x');
  const newProviderAddress = await deployPriceProviderFake(input.network);
  console.log(newProviderAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
