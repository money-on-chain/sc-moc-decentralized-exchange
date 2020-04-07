const { deployMinBlocksForTickChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  newMinBlocksForTick: process.argv[2]
};

if (!input.newMinBlocksForTick)
  throw new Error('Usage: node changeMinBlocksForTick.js <newMinBlocksForTick> [<network>]');
const execute = async () => {
  const contractAddress = await deployMinBlocksForTickChanger(
    input.network,
    input.newMinBlocksForTick
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
