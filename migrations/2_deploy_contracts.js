/* eslint-disable no-console */
const BigNumber = require('bignumber.js');
const _ = require('lodash');
const chunk = require('lodash/chunk');
const {
  scripts: { add, push, create, setAdmin },
  ConfigVariablesInitializer
} = require('zos');

const { getGovernanceContracts, addTokenPairs } = require('./utils')(artifacts);
const allConfig = require('./config');

const DEX_NAME = 'MoCDecentralizedExchange';
const FEE_MANAGER_NAME = 'CommissionManager';

const MoCExchangeLib = artifacts.require('MoCExchangeLib');
const TickState = artifacts.require('TickState');
const SafeTransfer = artifacts.require('SafeTransfer');
const MoCDecentralizedExchange = artifacts.require(DEX_NAME);
const BproToken = artifacts.require('BProToken');
const DocToken = artifacts.require('DocToken');
const TestToken = artifacts.require('TestToken');
const WRBTC = artifacts.require('WRBTC');
const ERC20WithBlacklist = artifacts.require('ERC20WithBlacklist');
const TickStateFake = artifacts.require('TickStateFake');
const TokenPriceProviderFake = artifacts.require('TokenPriceProviderFake');
const MoCDexFake = artifacts.require('MoCDexFake');
const CommissionManager = artifacts.require(FEE_MANAGER_NAME);

const FORCE_DEPLOY = true;
const REUPLOAD = true;
const addDex = dexName => add({ contractsData: [{ name: dexName, alias: dexName }] });
const pushImplementations = options => push({ ...options });
const createDexProxy = (dexName, options, initArgs) =>
  create({ contractAlias: dexName, initMethod: 'initialize', initArgs, ...options });

module.exports = async function(deployer, currentNetwork, [owner]) {
  const deployFakes = currentNetwork === 'development' || currentNetwork === 'coverage';
  console.log('Deploying fakes?', deployFakes);
  const config = Object.assign({}, allConfig.default, allConfig[currentNetwork]);
  const { existingTokens } = config;
  const addresses = config.addressesToHaveBalance || [];
  addresses.push(owner);
  const {
    MAX_PENDING_TXS,
    ORDERS_FOR_TICK,
    MAX_BLOCKS_FOR_TICK,
    MIN_BLOCKS_FOR_TICK,
    MIN_ORDER_AMOUNT,
    MAX_ORDER_LIFESPAN,
    DEFAULT_PRICE_PRECISION,
    TOKEN_DECIMALS,
    COMMISSION_RATE,
    CANCELATION_PENALTY_RATE,
    EXPIRATION_PENALTY_RATE,
    TOKENS_TO_MINT
  } = config;
  const DEFAULT_PRICE_PRECISION_STRING = DEFAULT_PRICE_PRECISION.toString();
  const executeBatched = actions =>
    chunk(actions, MAX_PENDING_TXS).reduce(
      (previous, batch) =>
        previous.then(previousResults =>
          Promise.all(batch.map(it => it())).then(result => [...previousResults, ...result])
        ),
      Promise.resolve([])
    );

  const { network, txParams } = await ConfigVariablesInitializer.initNetworkConfiguration({
    network: currentNetwork,
    from: owner
  });
  const options = { network, txParams, force: FORCE_DEPLOY, reupload: REUPLOAD };

  // this is concurrent but we gotta take care not to
  // have over 4 pending transactions for an address.
  // since rsk's nodes start dropping them
  console.log('Deploying Tokens and libraries');
  await executeBatched([
    () => deployer.deploy(MoCExchangeLib),
    () => deployer.deploy(TickState),
    () => deployer.deploy(SafeTransfer),
    ...(!existingTokens
      ? [
          () => deployer.deploy(BproToken),
          () => deployer.deploy(WRBTC),
          () => deployer.deploy(DocToken),
          () => deployer.deploy(TestToken)
        ]
      : [])
  ]);

  const linkDex = Dex => {
    console.log('Linking libraries into dex');
    return Promise.all([deployer.link(MoCExchangeLib, Dex), deployer.link(TickState, Dex)]);
  };

  await linkDex(MoCDecentralizedExchange);
  if (deployFakes) await linkDex(MoCDexFake);

  const [bpro, doc, wrbtc, testToken] = existingTokens
    ? [
        existingTokens.BproToken,
        existingTokens.DocToken,
        existingTokens.WRBTC,
        existingTokens.TestToken
      ]
    : await Promise.all([
        BproToken.deployed(),
        DocToken.deployed(),
        WRBTC.deployed(),
        TestToken.deployed()
      ]);

  console.log('Getting governance contracts');
  const [governor, stopper, proxyAdmin, upgradeDelegator] = await getGovernanceContracts(
    config,
    owner,
    options,
    deployer
  );

  console.log('Adding Fee manager');
  await add({ contractsData: [{ name: FEE_MANAGER_NAME, alias: FEE_MANAGER_NAME }] });

  console.log('Pushing implementations (fee manager)');
  await pushImplementations(options);

  console.log('Creating proxy for fee manager');
  const commissionManagerProxy = await create({
    contractAlias: FEE_MANAGER_NAME,
    initMethod: 'initialize',
    initArgs: [
      config.beneficiaryAddress,
      (COMMISSION_RATE * TOKEN_DECIMALS).toString(),
      (CANCELATION_PENALTY_RATE * TOKEN_DECIMALS).toString(),
      (EXPIRATION_PENALTY_RATE * TOKEN_DECIMALS).toString(),
      governor.address,
      owner
    ],
    ...options
  });

  console.log('Setting admin for dex');
  await setAdmin({ newAdmin: proxyAdmin.address, contractAlias: FEE_MANAGER_NAME, ...options });

  console.log('Getting commission manager');
  const commissionManager = await CommissionManager.at(commissionManagerProxy.address);

  console.log('Adding dex');
  await addDex(DEX_NAME);

  console.log('Pushing implementations (dex)');
  await pushImplementations(options);

  if (deployFakes) {
    console.log('Adding fake Dex');
    await addDex('MoCDexFake');
    console.log('Pushing implementations (dex fake)');
    await pushImplementations(options);
  }

  console.log('Creating proxy for dex');
  const params = [
    doc.address,
    commissionManager.address,
    ORDERS_FOR_TICK,
    MAX_BLOCKS_FOR_TICK,
    MIN_BLOCKS_FOR_TICK,
    MIN_ORDER_AMOUNT.toString(),
    MAX_ORDER_LIFESPAN,
    governor.address,
    stopper.address
  ];
  const dexProxy = await createDexProxy(DEX_NAME, options, params);

  console.log('Setting admin to dex');
  await setAdmin({ newAdmin: proxyAdmin.address, contractAlias: DEX_NAME, ...options });

  if (deployFakes) {
    console.log('Creating fake dex proxy');
    await createDexProxy('MoCDexFake', options, params);
    console.log('Settings admin to fake dex');
    await setAdmin({ newAdmin: proxyAdmin.address, contractAlias: 'MoCDexFake', ...options });
  }

  console.log('Transferying ownership from dex to owner');
  await commissionManager.transferOwnership(dexProxy.address, { from: owner });

  console.log('Getting contracts', dexProxy.address);
  // deployer.deploy returns undefined. This is not documented in
  // https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations

  const { haveToAddTokenPairs } = config;
  const { existingPriceProviders } = config;
  
  // TODO: ADD READING FROM config.json
  const docBproPriceProvider = await TokenPriceProviderFake.new();
  const docTestTokenPricProvider = await TokenPriceProviderFake.new();
  const docWrbtcPricProvider = await TokenPriceProviderFake.new();
  const wrbtcBproPricProvider = await TokenPriceProviderFake.new();
  const wrbtcTestTokenPricProvider = await TokenPriceProviderFake.new();

  const tokenPairsToAdd = [
    [
      doc.address,
      bpro.address,
      docBproPriceProvider.address,
      DEFAULT_PRICE_PRECISION_STRING,
      DEFAULT_PRICE_PRECISION_STRING
    ],
    [
      doc.address,
      testToken.address,
      docTestTokenPricProvider.address,
      DEFAULT_PRICE_PRECISION_STRING,
      DEFAULT_PRICE_PRECISION_STRING
    ],
    [
      doc.address,
      wrbtc.address,
      docWrbtcPricProvider.address,
      DEFAULT_PRICE_PRECISION_STRING,
      DEFAULT_PRICE_PRECISION_STRING
    ],
    [
      wrbtc.address,
      bpro.address,
      wrbtcBproPricProvider.address,
      DEFAULT_PRICE_PRECISION_STRING,
      DEFAULT_PRICE_PRECISION_STRING
    ],
    [
      wrbtc.address,
      testToken.address,
      wrbtcTestTokenPricProvider.address,
      DEFAULT_PRICE_PRECISION_STRING,
      DEFAULT_PRICE_PRECISION_STRING
    ]
  ];

  console.log('Getting dex contract at', dexProxy.address);
  const dex = await MoCDecentralizedExchange.at(dexProxy.address);

  if (haveToAddTokenPairs) {
    console.log('Adding token pairs to dex');
    await addTokenPairs(tokenPairsToAdd, dex, governor);
  } else {
    console.log('Tokens pairs that should be added');
    console.log(tokenPairsToAdd);
  }

  if (deployFakes) {
    console.log('Deploying ERC20WithBlacklist');
    await deployer.deploy(ERC20WithBlacklist);
    console.log('Deploying TickStateFake');
    await deployer.link(TickState, TickStateFake).then(() => deployer.deploy(TickStateFake));
    const tickStateFake = await TickStateFake.deployed();
    await tickStateFake.initialize(
      doc.address,
      bpro.address,
      ORDERS_FOR_TICK,
      MAX_BLOCKS_FOR_TICK,
      MIN_BLOCKS_FOR_TICK
    );
  }

  if (!existingTokens) {
    console.log('Minting for all the addresses');
    const tokensToMint = new BigNumber(TOKENS_TO_MINT).times(TOKEN_DECIMALS).toFixed();
    const mintFor = (token, address) => token.mint(address, tokensToMint);
    await executeBatched(
      _.flatten(
        addresses.map(address => [bpro, doc, testToken].map(tkn => () => mintFor(tkn, address)))
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        // The JSON.stringify is not strictly necessary,
        // it is just for convenience to ease the copy-pasting
        dex: dex.address,
        doc: doc.address,
        wrbtc: wrbtc.address,
        test: testToken.address,
        bpro: bpro.address,
        proxyAdmin: proxyAdmin.address,
        upgradeDelegator: upgradeDelegator.address,
        governor: governor.address,
        stopper: stopper.address,
        commissionManager: commissionManager.address
      },
      null,
      2
    )
  );
};
