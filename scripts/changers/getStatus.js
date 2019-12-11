const { getStatus } = require('./dexInteractions');

const input = {
  network: process.argv[2] || 'rskTestnet'
};

const execute = async () => {
  console.log(await getStatus(input.network));
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
