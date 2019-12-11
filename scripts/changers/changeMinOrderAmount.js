const { deployMinOrderAmountChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');
const input = {
  network: process.argv[3] || 'rskTestnet',

  minOrderAmount: process.argv[2]
};

if (!input.minOrderAmount)
  throw new Error('Usage: node changeMinOrderAmount.js <minOrderAmount> [<network>]');
const execute = async () => {
  const contractAddress = await deployMinOrderAmountChanger(
    input.network,
    input.minOrderAmount
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
