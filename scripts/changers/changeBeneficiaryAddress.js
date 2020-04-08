const { deployBeneficiaryAddressChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[3] || 'rskTestnet',
  beneficiaryAddress: process.argv[2]
};

if (!input.beneficiaryAddress)
  throw new Error('Usage: node changeBeneficiaryAddress.js <beneficiaryAddress> [<network>]');
const execute = async () => {
  const contractAddress = await deployBeneficiaryAddressChanger(
    input.network,
    input.beneficiaryAddress
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
