const CommissionManager = require('../../build/contracts/CommissionManager.json');
const MoCDecentralizedExchange = require('../../build/contracts/MoCDecentralizedExchange.json');
const { getWeb3, getConfig } = require('./networkHelper');

const getChargedCommissions = async (network, tokenAddress) => {
  const web3 = getWeb3(network);
  const config = getConfig(network);
  const commissionManager = new web3.eth.Contract(CommissionManager.abi, config.commissionManager);
  return commissionManager.methods.exchangeCommissions(tokenAddress).call();
};

const withdrawCommissions = async (network, tokenAddress) => {
  const web3 = getWeb3(network);
  const config = getConfig(network);
  const accounts = await web3.eth.getAccounts();
  const dex = new web3.eth.Contract(MoCDecentralizedExchange.abi, config.dex);
  return dex.methods.withdrawCommissions(tokenAddress).send({ from: accounts[0] });
};
const getStatus = async network => {
  const web3 = getWeb3(network);
  const config = getConfig(network);
  const commissionManager = new web3.eth.Contract(CommissionManager.abi, config.commissionManager);
  const dex = new web3.eth.Contract(MoCDecentralizedExchange.abi, config.dex);
  const currentPairs = await dex.methods.getTokenPairs().call();
  return {
    beneficiaryAddress: await commissionManager.methods.beneficiaryAddress().call(),
    cancelationPenaltyRate: await commissionManager.methods.cancelationPenaltyRate().call(),
    expirationPenaltyRate: await commissionManager.methods.expirationPenaltyRate().call(),
    commissionRate: await commissionManager.methods.commissionRate().call(),
    minOrderAmount: await dex.methods.minOrderAmount().call(),
    maxOrderLifespan: await dex.methods.maxOrderLifespan().call(),
    tickConfig: await dex.methods.tickConfig().call(),
    pairs: currentPairs,
    pairsStatus: await Promise.all(
      currentPairs.map(pair => dex.methods.getTokenPairStatus(...pair).call())
    )
  };
};

module.exports = {
  getChargedCommissions,
  withdrawCommissions,
  getStatus
};
