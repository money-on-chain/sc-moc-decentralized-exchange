const { deployAddTokenPairChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');

const input = {
  network: process.argv[6] || 'rskTestnet',
  baseAddress: process.argv[2],
  secondaryAddress: process.argv[3],
  initPrice: process.argv[4],
  pricePrecision: process.argv[5]
};

if (!input.baseAddress || !input.secondaryAddress || !input.initPrice || !input.pricePrecision)
  throw new Error(
    'Usage: node disablePair.js <baseAddress> <secondaryAddress> <initPrice> <pricePrecision> [<network>]'
  );
const execute = async () => {
  const contractAddress = await deployAddTokenPairChanger(
    input.network,
    input.baseAddress,
    input.secondaryAddress,
    input.initPrice,
    input.pricePrecision
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};
execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
