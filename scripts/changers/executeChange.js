const { executeChange } = require('./changerHelper');

const input = {
  network: 'rskTestnet',
  changerAddress: process.argv[2]
};

const execute = async () => {
  return executeChange(input.network, input.changerAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
