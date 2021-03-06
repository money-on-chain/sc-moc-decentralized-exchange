const chunk = require('lodash/chunk');
const { BN, expectEvent } = require('openzeppelin-test-helpers');
const BigNumber = require('bignumber.js');

const TokenPriceProviderFake = artifacts.require('TokenPriceProviderFake');

const {
  DEFAULT_PRICE,
  DEFAULT_AMOUNT,
  DEFAULT_LIFESPAN,
  DEFAULT_PRICE_PRECISION,
  DEFAULT_ACCOUNT_INDEX,
  DEFAULT_BALANCE,
  MAX_PENDING_TXS
} = require('./constants');

const toBNWithPrecision = (number, precision) =>
  new BN(new BigNumber(number).times(precision).toFixed());
const wadify = number => toBNWithPrecision(number, 10 ** 18);
const pricefy = number => toBNWithPrecision(number, DEFAULT_PRICE_PRECISION.toString());

const DEFAULT_BALANCES_AND_ALLOWANCES = {
  [DEFAULT_ACCOUNT_INDEX]: {
    baseBalance: DEFAULT_BALANCE,
    baseAllowance: DEFAULT_BALANCE,
    secondaryBalance: DEFAULT_BALANCE,
    secondaryAllowance: DEFAULT_BALANCE,
    testTokenBalance: DEFAULT_BALANCE,
    testTokenAllowance: DEFAULT_BALANCE
  }
};

const setBalancesAndAllowances = async function({
  dex,
  base,
  secondary,
  testToken,
  userData,
  accounts
}) {
  const dexInstance = dex || (await this.getDex());
  const baseInstance = base || (await this.getBase());
  const secondaryInstance = secondary || (await this.getSecondary());
  const testTokenInstance = testToken || (await this.getTestToken());
  const accountsToUse = userData || DEFAULT_BALANCES_AND_ALLOWANCES;
  await Promise.all(
    Object.keys(accountsToUse).map(accountIndex => {
      const values = accountsToUse[accountIndex];
      const { shouldWadify = true } = values;
      const contractify = shouldWadify ? wadify : i => i;
      return Promise.all([
        values.baseBalance
          ? baseInstance.mint(accounts[accountIndex], contractify(values.baseBalance), {
              from: accounts[0]
            })
          : Promise.resolve(),
        values.baseAllowance
          ? baseInstance.approve(dexInstance.address, contractify(values.baseAllowance), {
              from: accounts[accountIndex]
            })
          : Promise.resolve(),
        values.secondaryBalance
          ? secondaryInstance.mint(accounts[accountIndex], contractify(values.secondaryBalance), {
              from: accounts[0]
            })
          : Promise.resolve(),
        values.secondaryAllowance
          ? secondaryInstance.approve(dexInstance.address, contractify(values.secondaryAllowance), {
              from: accounts[accountIndex]
            })
          : Promise.resolve(),
        values.testTokenBalance
          ? testTokenInstance.mint(accounts[accountIndex], contractify(values.testTokenBalance), {
              from: accounts[0]
            })
          : Promise.resolve(),
        values.testTokenAllowance
          ? testTokenInstance.approve(dexInstance.address, contractify(values.testTokenAllowance), {
              from: accounts[accountIndex]
            })
          : Promise.resolve()
      ]);
    })
  );
};

const executeBatched = actions =>
  chunk(actions, MAX_PENDING_TXS).reduce(
    (previous, batch) =>
      previous.then(previousResults =>
        Promise.all(batch.map(it => it())).then(result => [...previousResults, ...result])
      ),
    Promise.resolve([])
  );

const orderArrayToObj = order => ({
  id: order[0],
  owner: order[1],
  exchangeableAmount: order[2],
  multiplyFactor: order[3],
  reservedCommission: order[4],
  price: order[5],
  next: order[6]
});

const getOrderAtIndex = async (dex, baseAddress, secondaryAddress, index, isBuy) => {
  const order = await dex.getOrderAtIndex(baseAddress, secondaryAddress, index, isBuy);
  return orderArrayToObj(order);
};
const getSellOrderAtIndex = dex => async (baseAddress, secondaryAddress, index) =>
  getOrderAtIndex(dex, baseAddress, secondaryAddress, index, false);

const getBuyOrderAtIndex = dex => async (baseAddress, secondaryAddress, index) =>
  getOrderAtIndex(dex, baseAddress, secondaryAddress, index, true);

const setOracleMarketPrice = async (dex, baseAddress, secondaryAddress, newPrice) => {
  const priceProvider = await getPriceProvider(dex, baseAddress, secondaryAddress);
  await priceProvider.poke(pricefy(newPrice));
};

const getPriceProvider = async (dex, baseAddress, secondaryAddress) => {
  const dexInstance = dex || (await this.getDex());
  const priceProviderAddress = await dexInstance.getPriceProvider(baseAddress, secondaryAddress);
  const priceProvider = await TokenPriceProviderFake.at(priceProviderAddress);
  return priceProvider;
};

const decorateGetOrderAtIndex = dex =>
  Object.assign({}, dex, {
    getBuyOrderAtIndex: getBuyOrderAtIndex(dex),
    getSellOrderAtIndex: getSellOrderAtIndex(dex)
  });

const insertLimitOrder = async ({
  dex,
  defaultPair,
  type,
  accounts,
  accountIndex = DEFAULT_ACCOUNT_INDEX,
  pending,
  ...props
}) => {
  const insertFn = type === 'buy' ? 'insertBuyLimitOrder' : 'insertSellLimitOrder';
  const amount = wadify(props.amount || DEFAULT_AMOUNT);
  const price = pricefy(props.price || DEFAULT_PRICE);
  const expiresInTick = props.expiresInTick || DEFAULT_LIFESPAN;
  const from = props.from || accounts[accountIndex];
  const baseToken = props.base || defaultPair.base;
  const secondaryToken = props.secondary || defaultPair.secondary;
  const insertReceipt = await dex[insertFn](
    baseToken.address,
    secondaryToken.address,
    amount,
    price,
    expiresInTick,
    { from }
  );
  return expectEvent.inLogs(
    insertReceipt.logs,
    pending ? 'NewOrderAddedToPendingQueue' : 'NewOrderInserted'
  ).args;
};

const insertMarketOrder = async ({
  dex,
  defaultPair,
  type,
  accounts,
  accountIndex = DEFAULT_ACCOUNT_INDEX,
  pending,
  ...props
}) => {
  const amount = wadify(props.amount || 10);
  const priceMultiplier = pricefy(props.priceMultiplier || 1);
  const expiresInTick = props.expiresInTick || 5;
  const from = props.from || accounts[accountIndex];
  const baseToken = props.base || defaultPair.base;
  const secondaryToken = props.secondary || defaultPair.secondary;

  const insertReceipt = await dex.insertMarketOrder(
    baseToken.address,
    secondaryToken.address,
    amount,
    priceMultiplier,
    expiresInTick,
    type === 'buy',
    {
      from
    }
  );

  return expectEvent.inLogs(
    insertReceipt.logs,
    pending ? 'NewOrderAddedToPendingQueue' : 'NewOrderInserted'
  ).args;
};

const decorateOrderInsertions = (dex, accounts, pair) =>
  Object.assign({}, dex, {
    insertBuyLimitOrder: props =>
      insertLimitOrder({ dex, defaultPair: pair, accounts, type: 'buy', ...props }),
    insertSellLimitOrder: props =>
      insertLimitOrder({ dex, defaultPair: pair, accounts, type: 'sell', ...props }),
    insertBuyMarketOrder: props =>
      insertMarketOrder({ dex, defaultPair: pair, accounts, type: 'buy', ...props }),
    insertSellMarketOrder: props =>
      insertMarketOrder({ dex, defaultPair: pair, accounts, type: 'sell', ...props })
  });

module.exports = {
  wadify,
  pricefy,
  toBNWithPrecision,
  setBalancesAndAllowances,
  DEFAULT_BALANCES_AND_ALLOWANCES,
  decorateGetOrderAtIndex,
  decorateOrderInsertions,
  executeBatched,
  setOracleMarketPrice,
  getPriceProvider
};
