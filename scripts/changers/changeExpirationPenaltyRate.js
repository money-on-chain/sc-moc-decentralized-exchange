const { deployExpirationPenaltyRateChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');
const input = {
  network: process.argv[3] || 'rskTestnet',
  expirationPenaltyRate: process.argv[2]
};

if (!input.expirationPenaltyRate)
  throw new Error('Usage: node changeExpirationPenaltyRate.js <expirationPenaltyRate> [<network>]');
const execute = async () => {
  const contractAddress = await deployExpirationPenaltyRateChanger(
    input.network,
    input.expirationPenaltyRate
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
