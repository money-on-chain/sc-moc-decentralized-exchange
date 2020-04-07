const { deployCommissionRateChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  commissionRate: process.argv[2]
};

if (!input.commissionRate)
  throw new Error('Usage: node changeCommissionRate.js <commissionRate> [<network>]');
const execute = async () => {
  const contractAddress = await deployCommissionRateChanger(input.network, input.commissionRate);
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
