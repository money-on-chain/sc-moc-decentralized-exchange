const path = require('path');
const _ = require('lodash');
const jsonfile = require('jsonfile');
const { execSync } = require('child_process');
const testHelperBuilder = require('./testHelpers/testHelper');

const REPORT_DIR = './reports/';
const REPORT_FILENAME = 'gasCosts.json';

let wadify;
let pricefy;
let testHelper;
let DEFAULT_ACCOUNT_INDEX;
let WAD_PRECISION;
let dex;
let base;
let secondary;
let report;
let pair;
const MARKET_PRICE = 2;

const setContractsAndBalances = async function(accounts) {
  await testHelper.createContracts({
    owner: accounts[0],
    useFakeDex: true, // We need Fake to manipulate order expired in Tick
    tokenPair: {}, // Will add the default base and secondary pair
    ordersForTick: 2,
    maxBlocksForTick: 2,
    minBlocksForTick: 1
  });
  [dex, base, secondary] = await Promise.all([
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary()
  ]);
  pair = [base.address, secondary.address];
  const userData = [1, 2, 3, 4, 5].reduce(
    (acc, it) => ({
      ...acc,
      [it]: {
        baseBalance: 1e9,
        baseAllowance: 1e9,
        secondaryBalance: 1e9,
        secondaryAllowance: 1e9
      }
    }),
    {}
  );
  await testHelper.setBalancesAndAllowances({ userData, accounts });
};

const assertLengths = (buyLength = 0, sellLength = 0) =>
  async function() {
    testHelper.assertBig(await dex.buyOrdersLength(...pair), buyLength, 'buyOrdersLength');
    testHelper.assertBig(await dex.sellOrdersLength(...pair), sellLength, 'sellOrdersLength');
  };

describe('volume tests and gas cost report generation, using a 1% commission rate', function() {
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, WAD_PRECISION, DEFAULT_ACCOUNT_INDEX } = testHelper);
    report = {
      // Updated Sep '19
      metadata: {
        eth: {
          gasUnit: 'gas',
          gasPrice: 22 * 10 ** 9, // AVG Gas price ~22 Gwei
          usdPrice: 180, // as Sep19
          gasLimit: 8e6
        },
        rsk: {
          gasUnit: 'gas',
          gasPrice: 65 * 10 ** 6, // AVG Gas price 65,164,000 wei
          usdPrice: 10000, // as Sep19
          gasLimit: 6.8e6
        }
      },
      testCases: {}
    };
  });

  describe('match n orders against n orders', function() {
    [
      {
        description: '10 buys against 10 sells',
        totalOrders: 10
      },
      {
        description: '15 buys against 15 sells',
        totalOrders: 15
      }
    ].forEach(({ description, totalOrders }) => {
      contract(description, function(accounts) {
        let logObject;
        before(async function() {
          await setContractsAndBalances(accounts);
          let receipts = [];
          report.testCases[description] = {};
          logObject = report.testCases[description];
          const getFrom = i => accounts[1 + (i % 5)];
          // this creates an orderbook with totalOrders double full matches
          for (let i = totalOrders; i > 0; i--) {
            receipts = [
              // intentionally sequential
              // eslint-disable-next-line no-await-in-loop
              ...(await Promise.all([
                dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from: getFrom(i) }),
                dex.insertBuyLimitOrder(...pair, wadify(1), pricefy(1), 5, { from: getFrom(i + 1) })
              ])).map(tx => tx.receipt),
              ...receipts
            ];
          }
          logObject.insertion = receipts.reduce((sum, curr) => curr.gasUsed + sum, 0);
          logObject.insertionAvg = logObject.insertion / (totalOrders * 2);
        });
        it(
          `GIVEN there are ${totalOrders} buy and sell orders`,
          assertLengths(totalOrders, totalOrders)
        );
        describe('WHEN matching orders', function() {
          before(async function() {
            // Use a ridicoulously big amount of steps to ensure to be completing the steps
            const {
              receipt: { gasUsed }
            } = await dex.matchOrders(...pair, 3000, {
              from: accounts[0],
              gas: 6.8e6
            });
            logObject.match = { gasUsed };
          });
          it('THEN both orderbooks are empty', assertLengths());
        });
      });
    });
  });

  const totalOrdersPerType = 21;
  const descriptionUniqueTest = `match ${totalOrdersPerType} vs ${totalOrdersPerType} orders, orderbook with half expired in between`;
  contract(descriptionUniqueTest, function(accounts) {
    let logObject;
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(async function() {
      await setContractsAndBalances(accounts);
      // match to advance tick
      // Use a ridicoulously big amount of steps to ensure to be completing the steps
      await dex.matchOrders(...pair, 3000, {
        gas: 6.8e6
      });
      report.testCases[descriptionUniqueTest] = {};
      logObject = report.testCases[descriptionUniqueTest];
      const getFrom = i => accounts[1 + (i % 5)];
      // First inserts all buys, the all sell. That way id are predictable to be edited (expired)
      let promises = [];
      for (let i = totalOrdersPerType; i > 0; i--) {
        promises.push(
          dex.insertBuyLimitOrder(...pair, wadify(1), pricefy(1), 5, { from: getFrom(i + 1) })
        );
      }
      await Promise.all(promises);
      promises = [];
      for (let i = totalOrdersPerType; i > 0; i--) {
        promises.push(
          dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from: getFrom(i) })
        );
      }
      await Promise.all(promises);
      promises = [];
      for (let i = 2; i <= totalOrdersPerType; i += 2) {
        promises.concat([
          dex.editOrder(...pair, i.toString(), true, '1'),
          dex.editOrder(...pair, (i + totalOrdersPerType).toString(), false, '1')
        ]);
      }
      await Promise.all(promises);
    });
    it(
      `GIVEN there are ${totalOrdersPerType} buy and sell orders`,
      assertLengths(totalOrdersPerType, totalOrdersPerType)
    );
    describe('WHEN matching orders', function() {
      before(async function() {
        // Use a ridicoulously big amount of steps to ensure to be completing the steps
        const tx = await dex.matchOrders(...pair, 3000, {
          from: accounts[0],
          gas: 6.8e6
        });
        const matchEvents = testHelper.findEvents(tx, 'ExpiredOrderProcessed');
        expect(matchEvents).to.have.lengthOf(totalOrdersPerType - 1, 'wrong expired amount');
        logObject.match = { gasUsed: tx.receipt.gasUsed };
      });
      it('THEN both orderbooks are empty', assertLengths());
    });
  });

  describe('match n orders against 1 order', function() {
    [
      {
        description: '10 sells against 1 buy',
        totalOrders: 10
      },
      {
        description: '12 sells against 1 buy',
        totalOrders: 12
      },
      {
        description: '15 sells against 1 buy',
        totalOrders: 15
      },
      {
        description: '18 sells against 1 buy',
        totalOrders: 18
      }
    ].forEach(({ description, totalOrders }) => {
      contract(description, function(accounts) {
        let logObject;
        before(async function() {
          await setContractsAndBalances(accounts);
          let receipts = [];
          report.testCases[description] = {};
          logObject = report.testCases[description];
          const from = accounts[DEFAULT_ACCOUNT_INDEX];
          // this creates an orderbook with totalOrders sell orders
          // that match against a single buy order
          for (let i = 0; i < totalOrders; i++) {
            receipts = [
              // intentionally sequential
              // eslint-disable-next-line no-await-in-loop
              (await dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from })).receipt,
              ...receipts
            ];
          }
          logObject.sellOrdersInsertion = receipts.reduce((sum, curr) => curr.gasUsed + sum, 0);
          logObject.buyOrdersInsertion = (await dex.insertBuyLimitOrder(
            ...pair,
            wadify(totalOrders),
            pricefy(1),
            5,
            {
              from
            }
          )).receipt.gasUsed;
          logObject.insertionAvg =
            logObject.sellOrdersInsertion + logObject.buyOrdersInsertion / (totalOrders + 1);
        });
        it(
          `GIVEN there are ${totalOrders} sell orders and one buy order`,
          assertLengths(1, totalOrders)
        );
        describe('WHEN matching orders', function() {
          before(async function() {
            // Use a ridicoulously big amount of steps to ensure to be completing the steps
            logObject.match = (await dex.matchOrders(...pair, 3000, {
              gas: 6.8e6
            })).receipt.gasUsed;
          });
          it('THEN both orderbooks are empty', assertLengths());
        });
      });
    });
  });

  describe('match n orders of each type(mo, lo) against 1 order', function() {
    [
      {
        description: '10 sells against 1 buy',
        totalOrdersByType: 5
      },
      {
        description: '12 sells against 1 buy',
        totalOrdersByType: 6
      },
      {
        description: '15 sells against 1 buy',
        totalOrdersByType: 7
      },
      {
        description: '16 sells against 1 buy',
        totalOrdersByType: 8
      }
    ].forEach(({ description, totalOrdersByType }) => {
      contract(description, function(accounts) {
        let logObject;
        before(async function() {
          await setContractsAndBalances(accounts);
          let receipts = [];
          report.testCases[description] = {};
          logObject = report.testCases[description];
          const from = accounts[DEFAULT_ACCOUNT_INDEX];
          // this creates an orderbook with totalOrdersByType sell limit orders
          // that match against a single buy order
          for (let i = 0; i < totalOrdersByType; i++) {
            receipts = [
              // intentionally sequential
              // eslint-disable-next-line no-await-in-loop
              (await dex.insertSellLimitOrder(...pair, wadify(1), pricefy(1), 5, { from })).receipt,
              ...receipts
            ];
          }
          // this adds the totalOrdersByType sell marketOrder
          for (let i = 0; i < totalOrdersByType; i++) {
            receipts = [
              // intentionally sequential
              // eslint-disable-next-line no-await-in-loop
              (await dex.insertMarketOrder(
                ...pair,
                wadify(1),
                pricefy(1 / MARKET_PRICE),
                5,
                false,
                { from }
              )).receipt,
              ...receipts
            ];
          }
          logObject.sellOrdersInsertion = receipts.reduce((sum, curr) => curr.gasUsed + sum, 0);
          logObject.buyOrdersInsertion = (await dex.insertBuyLimitOrder(
            ...pair,
            wadify(totalOrdersByType * 2),
            pricefy(1),
            5,
            {
              from
            }
          )).receipt.gasUsed;
          logObject.insertionAvg =
            logObject.sellOrdersInsertion +
            logObject.buyOrdersInsertion / (totalOrdersByType * 2 + 1);
        });
        it(
          `GIVEN there are ${totalOrdersByType} sell orders of each type and one buy order`,
          assertLengths(1, totalOrdersByType * 2)
        );
        describe('WHEN matching orders', function() {
          before(async function() {
            // Use a ridicoulously big amount of steps to ensure to be completing the steps
            logObject.match = (await dex.matchOrders(...pair, 3000, {
              gas: 6.8e6
            })).receipt.gasUsed;
          });

          it('THEN both orderbooks are empty', assertLengths());
        });
      });
    });
  });

  after(async function() {
    // go POSIX or go home
    execSync(`[ -d "${REPORT_DIR}" ] || mkdir "${REPORT_DIR}"`, { timeout: 2000 });

    const completeAmounts = function completeAmounts(object, metadata, key) {
      const type = typeof object[key];
      if (type === 'number') {
        const gasAmount = object[key];
        const weiAmount = gasAmount * metadata.gasPrice;
        const ethAmount = weiAmount / WAD_PRECISION;
        const usdAmount = (ethAmount * metadata.usdPrice).toFixed(2);
        // eslint-disable-next-line no-param-reassign
        object[key] = { gasAmount, weiAmount, ethAmount, usdAmount };
        if (!key.toLowerCase().includes('insertion')) {
          // Fake because gasUsed cannot be used to estimate gasLimit as it is the result
          // the end result accounting the returned gas in concept of for example storage freed.
          // But the actual limit that triggers the rever could had been reached before.
          // eslint-disable-next-line
          object[key].fakeGasLimit = ((100 * gasAmount) / metadata.gasLimit).toFixed(2) + ' %';
        }
      } else if (type === 'object') {
        Object.keys(object[key]).forEach(innerKey =>
          completeAmounts(object[key], metadata, innerKey)
        );
      }
    };
    const ethReport = _.cloneDeep(report);
    completeAmounts(ethReport, report.metadata.eth, 'testCases');
    await jsonfile.writeFile(path.join(REPORT_DIR, 'eth.' + REPORT_FILENAME), ethReport, {
      spaces: 2
    });
    const rskReport = _.cloneDeep(report);
    completeAmounts(rskReport, report.metadata.rsk, 'testCases');
    await jsonfile.writeFile(path.join(REPORT_DIR, 'rsk.' + REPORT_FILENAME), rskReport, {
      spaces: 2
    });
  });
});
