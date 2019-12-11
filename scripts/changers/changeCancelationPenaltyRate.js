const { deployCancelationPenaltyRateChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');
const input = {
  network: process.argv[3] || 'rskTestnet',
  cancelationPenaltyRate: process.argv[2]
};

if (!input.cancelationPenaltyRate)
  throw new Error(
    'Usage: node changeCancelationPenaltyRate.js <cancelationPenaltyRate> [<network>]'
  );
const execute = async () => {
  const contractAddress = await deployCancelationPenaltyRateChanger(
    input.network,
    input.cancelationPenaltyRate
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
