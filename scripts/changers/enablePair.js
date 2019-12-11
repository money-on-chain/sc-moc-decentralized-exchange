const { deployTokenEnabler } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[4] || 'rskTestnet',
  baseAddress: process.argv[2],
  secondaryAddress: process.argv[3]
};

if (!input.baseAddress || !input.secondaryAddress)
  throw new Error('Usage: node enablePair.js <baseAddress> <secondaryAddress> [<network>]');
const execute = async () => {
  const contractAddress = await deployTokenEnabler(
    input.network,
    input.baseAddress,
    input.secondaryAddress
  );
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
