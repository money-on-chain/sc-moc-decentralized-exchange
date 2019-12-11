const { deployExpectedOrdersForTickChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');
const input = {
  network: process.argv[3] || 'rskTestnet',

  expectedOrdersForTick: process.argv[2]
};

if (!input.expectedOrdersForTick)
  throw new Error(
    'Usage: node changeExpectedOrdersForTick.js <baseAddress> <secondaryAddress> <expectedOrdersForTick> [<network>]'
  );
const execute = async () => {
  const contractAddress = await deployExpectedOrdersForTickChanger(
    input.network,
    input.expectedOrdersForTick
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
