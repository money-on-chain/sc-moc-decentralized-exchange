const { deployMaxBlocksForTickChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  newMaxBlocksForTick: process.argv[2]
};

if (!input.newMaxBlocksForTick)
  throw new Error('Usage: node changeMaxBlockForTick.js <newMaxBlocksForTick> [<network>]');
const execute = async () => {
  const contractAddress = await deployMaxBlocksForTickChanger(
    input.network,
    input.newMaxBlocksForTick
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
