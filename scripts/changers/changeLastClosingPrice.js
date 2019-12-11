const { deployLastClosingPriceChanger } = require('./deployContracts');
const { executeChange } = require('./networkHelper');
const input = {
  network: process.argv[5] || 'rskTestnet',
  baseToken: process.argv[2],
  secondaryToken: process.argv[3],
  price: process.argv[4]
};

if (!input.baseToken || !input.secondaryToken || !input.price)
  throw new Error(
    'Usage: node changeLastClosingPrice.js <baseToken> <secondaryToken> <price> [<network>]'
  );
const execute = async () => {
  const contractAddress = await deployLastClosingPriceChanger(
    input.network,
    input.baseToken,
    input.secondaryToken,
    input.price
  );
  console.log(contractAddress);
  await executeChange(input.network, contractAddress);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
