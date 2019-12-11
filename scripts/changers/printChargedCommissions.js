const { getChargedCommissions } = require('./dexInteractions');

const input = {
  network: process.argv[3] || 'rskTestnet',
  tokenAddress: process.argv[2]
};

if (!input.tokenAddress)
  throw new Error('Usage: node getCommissions.js <tokenAddress> [<network>]');
const execute = async () => {
  const chargedCommissions = await getChargedCommissions(input.network, input.tokenAddress);
  console.log(chargedCommissions);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
