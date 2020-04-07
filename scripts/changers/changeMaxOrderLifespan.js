const { deployMaxOrderLifespanChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  maxOrderLifespan: process.argv[2]
};

if (!input.maxOrderLifespan)
  throw new Error('Usage: node changeMaxOrderLifespan.js <maxOrderLifespan> [<network>]');
const execute = async () => {
  const contractAddress = await deployMaxOrderLifespanChanger(
    input.network,
    input.maxOrderLifespan
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
