const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const abiDecoder = require('abi-decoder');
const _ = require('lodash');

const Governor = require('../../build/contracts/Governor.json');
const truffleConfig = require('../../truffle-config');
const config = require('./script-config.json');

const getNetworkHost = network => truffleConfig.networks[network].host;
const getNetworkPort = network => truffleConfig.networks[network].port;

const getDefaultProvider = network =>
  truffleConfig.networks[network].provider ||
  `http://${getNetworkHost(network)}:${getNetworkPort(network)}`;

const getWeb3 = (network, options) => {
  const provider = network
    ? getDefaultProvider(network)
    : new HDWalletProvider(options.pk, options.host);
  return new Web3(provider, null, {
    transactionConfirmationBlocks: 1
  });
};

const currentTimestamp = async web3 => {
  const lastBlock = await web3.eth.getBlock('latest');
  return lastBlock.timestamp;
};

const getConfig = network => config[network];

const decodeLog = async (web3, contractJson, eventName, tx) => {
  abiDecoder.addABI(contractJson.abi);
  const txReceipt = await new web3.eth.getTransactionReceipt(tx);
  console.log('Decoding Tx receipt', _.pick(txReceipt, ['transactionHash', 'from', 'to']));

  const decoded = abiDecoder.decodeLogs(txReceipt.logs);
  const event = decoded.find(it => it && it.name === eventName);

  console.log(`${eventName} event:`, event.events);
  return event;
};

const deployContract = async (newContract, network, constructorArguments) => {
  const web3 = getWeb3(network);
  console.log(`Getting accounts in ${network}`);

  const [owner] = await web3.eth.getAccounts();
  console.log('Getting contracts constructor');
  const NewContractConstructor = await new web3.eth.Contract(newContract.abi);
  console.log('Deploying');
  const result = await NewContractConstructor.deploy({
    data: newContract.bytecode,
    arguments: constructorArguments
  }).send({ from: owner, gas: 1e6 });
  console.log(result._address);
  return result._address;
};

const executeChange = async (network, changerAddress) => {
  const configToUse = getConfig(network);
  const web3 = getWeb3(network);
  const [owner] = await web3.eth.getAccounts();
  const governor = await new web3.eth.Contract(Governor.abi, configToUse.governor);

  return governor.methods.executeChange(changerAddress).send({ from: owner, gas: 1e6 });
};
// Theory behind
// https://ethereum.stackexchange.com/questions/11030/how-can-i-deploy-a-contract-with-reference-to-a-library-contract-without-using-a
// Important: libraryAddress must be without the initial a 0x
const linkLibrary = (contract, libraryName, libraryAddress) => {
  // eslint-disable-next-line no-param-reassign
  contract.bytecode = contract.bytecode.replace(new RegExp(`_*${libraryName}_*`), libraryAddress);
};

module.exports = {
  getWeb3,
  getNetworkHost,
  currentTimestamp,
  getConfig,
  decodeLog,
  deployContract,
  linkLibrary,
  executeChange
};
