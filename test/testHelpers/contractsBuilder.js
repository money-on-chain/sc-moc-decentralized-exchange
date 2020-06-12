const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const jsonfile = require('jsonfile');
const { addTokenPair } = require('./protectedFunctions');
const {
  DEFAULT_MAX_BLOCKS_FOR_TICK,
  DEFAULT_MAX_ORDER_LIFESPAN,
  DEFAULT_MIN_BLOCKS_FOR_TICK,
  DEFAULT_MIN_ORDER_AMOUNT,
  DEFAULT_ORDER_FOR_TICKS,
  DEFAULT_PRICE_PRECISION,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_CANCELATION_PENALTY_RATE,
  DEFAULT_EXPIRATION_PENALTY_RATE
} = require('./constants');

ZWeb3.initialize(web3.currentProvider);

const MoCDecentralizedExchangeProxy = Contracts.getFromLocal('MoCDecentralizedExchange');
const CommissionManagerProxy = Contracts.getFromLocal('CommissionManager');
const MoCDexFakeProxy = Contracts.getFromLocal('MoCDexFake');

// Supposing we are using EXACTLY that network id (1564754684494)
const getProxies = () => {
  const { proxies } = jsonfile.readFileSync('./zos.dev-1564754684494.json');
  return proxies;
};

const getProxyAddress = contractName => {
  const proxies = getProxies();
  const projectPrefix = 'decentralized-exchange';
  const proxiesOfInterest = proxies[`${projectPrefix}/${contractName}`];
  return proxiesOfInterest[proxiesOfInterest.length - 1].address;
};
const MoCDecentralizedExchange = artifacts.require('MoCDecentralizedExchange');
const MoCDexFake = artifacts.require('MoCDexFake');
const DocToken = artifacts.require('DocToken');
const BProToken = artifacts.require('BProToken');
const WRBTC = artifacts.require('WRBTC');
const TestToken = artifacts.require('TestToken');
const ERC20WithBlacklist = artifacts.require('ERC20WithBlacklist');
const TickStateFake = artifacts.require('TickStateFake');
const Governor = artifacts.require('Governor');
const Stopper = artifacts.require('Stopper');
const OwnerBurnableToken = artifacts.require('OwnerBurnableToken');
const CommissionManager = artifacts.require('CommissionManager');
const TokenPriceProviderFake = artifacts.require('TokenPriceProviderFake');

const getBaseToken = () => DocToken;
const getSecondaryToken = () => this.using.secondaryToken || BProToken;
const getMoCDex = () => (this.using.useFakeDex ? MoCDexFake : MoCDecentralizedExchange);
const getTickStateFake = () => TickStateFake;
const getOwnerBurnableToken = () => OwnerBurnableToken;

const getBase = () => DocToken.deployed();
const getSecondary = () => this.using.secondary || BProToken.deployed();
const getWRBTC = () => this.using.wrbtc || WRBTC.deployed();
const getTestToken = () => this.using.testToken || TestToken.deployed();
const getDex = () =>
  this.using.dex || MoCDecentralizedExchange.at(getProxyAddress('MoCDecentralizedExchange'));
const getCommissionManager = () =>
  this.using.commissionManager || CommissionManager.at(getProxyAddress('CommissionManager'));
const getTickState = () => this.using.tickState || TickStateFake.deployed();
const getGovernor = () => Governor.at(getProxyAddress('Governor'));
const getStopper = () => Stopper.at(getProxyAddress('Stopper'));
const getTokenPriceProviderFake = () => TokenPriceProviderFake;

const createTickStateFake = async ({ ordersForTick, maxBlocksForTick, minBlocksForTick }) => {
  this.using.tickState = await TickStateFake.new();
  const [tickState, base, secondary] = await Promise.all([
    getTickState(),
    getBase(),
    getSecondary()
  ]);
  await tickState.initialize(
    base.address,
    secondary.address,
    ordersForTick || 8,
    maxBlocksForTick || 12,
    minBlocksForTick || 4
  );
};

const createContracts = async ({
  owner,
  useBlacklist,
  useFakeDex,
  minOrderAmount,
  ordersForTick,
  maxBlocksForTick,
  minBlocksForTick,
  maxOrderLifespan,
  customBeneficiaryAddress,
  commission,
  tokenPair
}) => {
  const project = await TestHelper();
  const moCDexProxy = await (useFakeDex
    ? project.createProxy(MoCDexFakeProxy)
    : project.createProxy(MoCDecentralizedExchangeProxy));
  this.using.useFakeDex = useFakeDex;
  this.using.dex = useFakeDex
    ? await MoCDexFake.at(moCDexProxy.address)
    : await MoCDecentralizedExchange.at(moCDexProxy.address);
  if (useBlacklist) {
    this.using.secondaryToken = ERC20WithBlacklist;
    this.using.secondary = await ERC20WithBlacklist.deployed();
  }
  const [dex, base, secondary, governor, stopper] = await Promise.all([
    getDex(),
    getBase(),
    getSecondary(),
    getGovernor(),
    getStopper()
  ]);

  const priceProviderFake = await getTokenPriceProviderFake().new();

  const { commissionRate, cancelationPenaltyRate, expirationPenaltyRate } = commission || {};

  const commissionManagerProxy = await project.createProxy(CommissionManagerProxy);

  const commissionManager = await CommissionManager.at(commissionManagerProxy.address);
  await commissionManager.initialize(
    customBeneficiaryAddress || owner,
    commissionRate || DEFAULT_COMMISSION_RATE,
    cancelationPenaltyRate || DEFAULT_CANCELATION_PENALTY_RATE,
    expirationPenaltyRate || DEFAULT_EXPIRATION_PENALTY_RATE,
    governor.address,
    owner
  );
  this.using.commissionManager = commissionManager;

  // base is assumed to be doc
  await dex.initialize(
    base.address,
    commissionManagerProxy.address,
    ordersForTick || DEFAULT_ORDER_FOR_TICKS,
    maxBlocksForTick || DEFAULT_MAX_BLOCKS_FOR_TICK,
    minBlocksForTick || DEFAULT_MIN_BLOCKS_FOR_TICK,
    minOrderAmount || DEFAULT_MIN_ORDER_AMOUNT,
    maxOrderLifespan || DEFAULT_MAX_ORDER_LIFESPAN,
    governor.address,
    stopper.address
  );

  await commissionManager.transferOwnership(dex.address);

  if (tokenPair) {
    const { pricePrecision, initialPrice } = tokenPair;
    // set initial price
    await priceProviderFake.poke(initialPrice || DEFAULT_PRICE_PRECISION.toString());
    await addTokenPair(dex)(
      base.address,
      secondary.address,
      priceProviderFake.address,
      pricePrecision || DEFAULT_PRICE_PRECISION.toString(),
      initialPrice || DEFAULT_PRICE_PRECISION.toString(),
      governor
    );
  }
};

module.exports = () => {
  this.using = {};
  return {
    createTickStateFake,
    createContracts,
    getBaseToken,
    getSecondaryToken,
    getMoCDex,
    getCommissionManager,
    getTickStateFake,
    getBase,
    getSecondary,
    getWRBTC,
    getDex,
    getTickState,
    getGovernor,
    getStopper,
    getOwnerBurnableToken,
    getTestToken,
    getTokenPriceProviderFake
  };
};
