const chunk = require('lodash/chunk');
const { BN, expectEvent } = require('openzeppelin-test-helpers');
const BigNumber = require('bignumber.js');
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
    secondaryAllowance: DEFAULT_BALANCE
  }
};

const setBalancesAndAllowances = async function({ dex, base, secondary, userData, accounts }) {
  const dexInstance = dex || (await this.getDex());
  const baseInstance = base || (await this.getBase());
  const secondaryInstance = secondary || (await this.getSecondary());
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

const getSellOrderAtIndex = dex => async (baseAddress, secondaryAddress, index) => {
  const order = await dex.getSellOrderAtIndex(baseAddress, secondaryAddress, index);
  return orderArrayToObj(order);
};

const getBuyOrderAtIndex = dex => async (baseAddress, secondaryAddress, index) => {
  const order = await dex.getBuyOrderAtIndex(baseAddress, secondaryAddress, index);
  return orderArrayToObj(order);
};

const decorateGetOrderAtIndex = dex =>
  Object.assign({}, dex, {
    getBuyOrderAtIndex: getBuyOrderAtIndex(dex),
    getSellOrderAtIndex: getSellOrderAtIndex(dex)
  });

const insertOrder = async ({
  dex,
  defaultPair,
  type,
  accounts,
  accountIndex = DEFAULT_ACCOUNT_INDEX,
  pending,
  ...props
}) => {
  const insertFn = type === 'buy' ? 'insertBuyOrder' : 'insertSellOrder';
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

const decorateOrderInsertions = (dex, accounts, pair) =>
  Object.assign({}, dex, {
    insertBuyOrder: props =>
      insertOrder({ dex, defaultPair: pair, accounts, type: 'buy', ...props }),
    insertSellOrder: props =>
      insertOrder({ dex, defaultPair: pair, accounts, type: 'sell', ...props })
  });

module.exports = {
  wadify,
  pricefy,
  toBNWithPrecision,
  setBalancesAndAllowances,
  DEFAULT_BALANCES_AND_ALLOWANCES,
  decorateGetOrderAtIndex,
  decorateOrderInsertions,
  executeBatched
};
