const { withdrawCommissions } = require('./dexInteractions');

const input = {
  network: process.argv[3] || 'rskTestnet',
  tokenAddress: process.argv[2]
};

if (!input.tokenAddress)
  throw new Error('Usage: node getCommissions.js <tokenAddress> [<network>]');

const execute = async () => {
  return withdrawCommissions(input.network, input.tokenAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
