const { getWeb3, getConfig } = require('./changerHelper');
const Stopper = require('../../build/contracts/Stopper.json');

const input = {
  network: 'qaTestnet',
  contractToBePaused: '0xc77853e63b9796926Bc49ea67e046F10e034220A'
};

const execute = async () => {
  const web3 = getWeb3(input.network);
  const config = getConfig(input.network);
  const [owner] = await web3.eth.getAccounts();
  const stopperContract = await new web3.eth.Contract(Stopper.abi, config.stopper);
  console.log(`Pausing ${input.contractToBePaused} from ${stopperContract.address} using ${owner}`);
  return stopperContract.methods
    .pause(input.contractToBePaused)
    .send({ from: owner })
    .on('transactionHash', hash => console.log('TxHash:', hash))
    .on('confirmation', confirmationNumber => console.log('Tx confirmation:', confirmationNumber))
    .on('receipt', receipt => console.log('Tx receipt:', receipt))
    .on('error', console.error);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
