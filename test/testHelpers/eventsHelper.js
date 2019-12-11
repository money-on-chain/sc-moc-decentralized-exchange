const abiDecoder = require('abi-decoder');

const MoCDecentralizedExchange = artifacts.require('./contracts/MoCDecentralizedExchange.sol');
const ERC20Token = artifacts.require(
  'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol'
);

abiDecoder.addABI(MoCDecentralizedExchange.abi);
abiDecoder.addABI(ERC20Token.abi);

const findEventsInTxs = (txs, eventName, eventArgs) => {
  const events = txs.map(tx => findEvents(tx, eventName, eventArgs));

  // Just a flat without lodash
  return events.reduce((accum, ev) => accum.concat(ev), []);
};

const findEvents = (tx, eventName, eventArgs) => {
  const txLogs = decodeLogs(tx.receipt);
  const logs = txLogs.filter(log => log && log.name === eventName);
  const events = logs.map(log => transformEvent(log.events));

  // Filter
  if (eventArgs) {
    return events.filter(ev => Object.entries(eventArgs).every(([k, v]) => ev[k] === v));
  }
  return events;
};

const transformEvent = event => {
  const obj = {};
  event.forEach(arg => {
    switch (arg.type) {
      case 'address':
        obj[arg.name] = web3.utils.toChecksumAddress(arg.value);
        break;
      case 'bool':
        obj[arg.name] = arg.value === 'true';
        break;
      default:
        // uints and string
        obj[arg.name] = arg.value;
    }
  });

  return obj;
};

const decodeLogs = txReceipt => abiDecoder.decodeLogs(txReceipt.rawLogs);

module.exports = {
  findEventsInTxs,
  findEvents,
  decodeLogs
};
