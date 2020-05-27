/* eslint-disable mocha/no-identical-title */
const { BN } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

let doc;
let dex;
let secondary;
let otherBase;
let otherSecondary;
let governor;
let getEmergentPriceValue;
let wadify;
let pricefy;
let DEFAULT_PRICE_PRECISION;
let DEFAULT_MAX_BLOCKS_FOR_TICK;
let DEFAULT_ACCOUNT_INDEX;
let testHelper;

const setContracts = async function(accounts) {
  testHelper = testHelperBuilder();
  ({
    wadify,
    pricefy,
    DEFAULT_PRICE_PRECISION,
    DEFAULT_MAX_BLOCKS_FOR_TICK,
    DEFAULT_ACCOUNT_INDEX
  } = testHelper);

  await testHelper.createContracts({
    owner: accounts[0],
    useFakeDex: true, // We need Fake to access orders at position
    ordersForTick: 2,
    maxBlocksForTick: 2,
    minBlocksForTick: 1
  });
  const OwnerBurnableToken = await testHelper.getOwnerBurnableToken();

  [dex, doc, secondary, otherBase, otherSecondary, governor] = await Promise.all([
    // default migrations lists a token pair by default
    testHelper.getDex(),
    testHelper.getBase(),
    testHelper.getSecondary(),
    OwnerBurnableToken.new(),
    OwnerBurnableToken.new(),
    testHelper.getGovernor()
  ]);
  getEmergentPriceValue = async (baseAddress, secondaryAddress) =>
    (await dex.getEmergentPrice.call(baseAddress, secondaryAddress)).emergentPrice;
  dex = await testHelper.decorateGovernedSetters(dex);
  dex = await testHelper.decorateGetOrderAtIndex(dex);
};

describe.only('multiple tokens tests', function() {
  contract('The matching should be independent for two token pairs', function(accounts) {
    const [, buyer, seller] = accounts;
    before('GIVEN the user has balance and allowance on all the tokens', async function() {
      await setContracts(accounts);
      const userData = {
        '1': {
          baseAllowance: 1000,
          baseBalance: 1000
        },
        '2': {
          secondaryBalance: 1000,
          secondaryAllowance: 1000
        }
      };
      await Promise.all([
        testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary,
          userData,
          accounts
        }),
        testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary: otherSecondary,
          userData,
          accounts
        })
      ]);
    });
    describe('AND there are limit orders in two token pairs', function() {
      before(async function() {
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.insertBuyOrder(doc.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: buyer
        });
        await dex.insertSellOrder(doc.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: seller
        });

        await dex.addTokenPair(
          doc.address,
          otherSecondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.insertBuyOrder(doc.address, otherSecondary.address, wadify(2), pricefy(2), 5, {
          from: buyer
        });
        await dex.insertSellOrder(doc.address, otherSecondary.address, wadify(1), pricefy(2), 5, {
          from: seller
        });
      });
      describe('Emergent price is generated independently for two token pairs', function() {
        it('WHEN calling getEmergentPrice, THEN the emergent prices are independent', async function() {
          await testHelper.assertBigPrice(getEmergentPriceValue(doc.address, secondary.address), 1);
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, otherSecondary.address),
            2
          );
        });
      });

      describe('matching can be run independently for different pairs', function() {
        describe('WHEN matching a token pair', function() {
          before(async function() {
            await testHelper.waitNBlocks(DEFAULT_MAX_BLOCKS_FOR_TICK);
            await dex.matchOrders(
              doc.address,
              secondary.address,
              testHelper.DEFAULT_STEPS_FOR_MATCHING
            );
          });
          it('THEN that pair is matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, secondary.address),
              0
            );
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, secondary.address), 0);
            await testHelper.assertBig(dex.sellOrdersLength(doc.address, secondary.address), 0);
          });
          it('AND the other pair is not matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, otherSecondary.address),
              2
            );
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, otherSecondary.address), 1);
            await testHelper.assertBig(
              dex.sellOrdersLength(doc.address, otherSecondary.address),
              1
            );
          });
        });
      });
    });
  });

  contract('The matching should be independent for two token pairs using LO and MO', function(
    accounts
  ) {
    const [, buyer, seller] = accounts;
    before('GIVEN the user has balance and allowance on all the tokens', async function() {
      await setContracts(accounts);
      await Promise.all([
        testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary,
          accounts
        }),
        testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary: otherSecondary,
          accounts
        })
      ]);
    });
    describe('AND there are orders in two token pairs', function() {
      before(async function() {
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.insertMarketOrder(
          doc.address,
          secondary.address,
          wadify(1),
          pricefy(0.9),
          10,
          true,
          {
            from: buyer
          }
        );
        console.log('Buy 1');
        await dex.insertMarketOrder(
          doc.address,
          secondary.address,
          wadify(1),
          pricefy(0.9),
          10,
          false,
          {
            from: buyer
          }
        );
        console.log('Sell 1');
        await dex.addTokenPair(
          doc.address,
          otherSecondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.insertMarketOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(2),
          10,
          true,
          {
            from: buyer
          }
        );        
        console.log('Buy 2');
        await dex.insertMarketOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(2),
          10,
          false,
          {
            from: buyer
          }
        );
        console.log('Sell 2');
      });
      describe('Emergent price is generated independently for two token pairs', function() {
        it('WHEN calling getEmergentPrice, THEN the emergent prices are independent', async function() {
          await testHelper.assertBigPrice(getEmergentPriceValue(doc.address, secondary.address), 1);
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, otherSecondary.address),
            2
          );
        });
      });

      describe('matching can be run independently for different pairs', function() {
        describe('WHEN matching a token pair', function() {
          before(async function() {
            await testHelper.waitNBlocks(DEFAULT_MAX_BLOCKS_FOR_TICK);
            await dex.matchOrders(
              doc.address,
              secondary.address,
              testHelper.DEFAULT_STEPS_FOR_MATCHING
            );
          });
          it('THEN that pair is matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, secondary.address),
              0
            );
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, secondary.address), 1);
            await testHelper.assertBig(dex.sellOrdersLength(doc.address, secondary.address), 1);
          });
          it('AND the other pair is not matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, otherSecondary.address),
              2
            );
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, otherSecondary.address), 2);
            await testHelper.assertBig(
              dex.sellOrdersLength(doc.address, otherSecondary.address),
              1
            );
          });
        });
      });
    });
  });

  [
    {
      comparisonPrecision: new BN(10).pow(new BN(14)).toString(),
      alternateComparisonPrecision: new BN(10).pow(new BN(20)).toString()
    },
    {
      comparisonPrecision: new BN(10).pow(new BN(7)).toString(),
      alternateComparisonPrecision: new BN(10).pow(new BN(3)).toString()
    },
    {
      comparisonPrecision: new BN(10).pow(new BN(5)).toString(),
      alternateComparisonPrecision: new BN(10).pow(new BN(4)).toString()
    },
    {
      comparisonPrecision: new BN(10).pow(new BN(4)).toString(),
      alternateComparisonPrecision: new BN(10).pow(new BN(6)).toString()
    }
  ].forEach(function(scenario) {
    contract('Tokens with different precisions', function(accounts) {
      const [, buyer, seller] = accounts;
      function convertToPrecision(input, precision) {
        return new BN(input).mul(new BN(precision));
      }
      before('GIVEN the user has balance and allowance on all the tokens', async function() {
        await setContracts(accounts);
        const userData = {
          '1': {
            baseAllowance: 1000000000, // this is specified with precision 18
            baseBalance: 1000000000 // and doesnt matter, it just needs to be a big number
          },
          '2': {
            secondaryBalance: 1000000000,
            secondaryAllowance: 1000000000
          }
        };
        await Promise.all([
          testHelper.setBalancesAndAllowances({
            dex,
            base: doc,
            secondary,
            userData,
            accounts
          }),
          testHelper.setBalancesAndAllowances({
            dex,
            base: otherBase,
            secondary: otherSecondary,
            userData,
            accounts
          })
        ]);
      });
      it(`AND there are orders in a token pair with comparisonPrecision ${scenario.comparisonPrecision}`, async function() {
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          scenario.comparisonPrecision,
          scenario.comparisonPrecision,
          governor
        );
        await dex.insertBuyOrder(
          doc.address,
          secondary.address,
          wadify(1),
          convertToPrecision(1, scenario.comparisonPrecision),
          5,
          {
            from: buyer
          }
        );
        await dex.insertSellOrder(
          doc.address,
          secondary.address,
          wadify(1),
          convertToPrecision(1, scenario.comparisonPrecision),
          5,
          {
            from: seller
          }
        );
      });
      it(`WHEN inserting orders on a second token pair, with precision ${scenario.alternateComparisonPrecision}`, async function() {
        // if this pair does not exist, the otherBase - otherSecondary is invalid
        await dex.addTokenPair(
          doc.address,
          otherBase.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.addTokenPair(
          otherBase.address,
          otherSecondary.address,
          scenario.alternateComparisonPrecision,
          scenario.alternateComparisonPrecision,
          governor
        );

        await dex.insertBuyOrder(
          otherBase.address,
          otherSecondary.address,
          wadify(2),
          convertToPrecision(2, scenario.alternateComparisonPrecision),
          5,
          {
            from: buyer
          }
        );
        await dex.insertSellOrder(
          otherBase.address,
          otherSecondary.address,
          wadify(1),
          convertToPrecision(2, scenario.alternateComparisonPrecision),
          5,
          {
            from: seller
          }
        );
      });
      it('THEN emergent prices have different precision', async function() {
        testHelper.assertBigWithPrecision(
          scenario.comparisonPrecision
        )(await getEmergentPriceValue(doc.address, secondary.address), 1);
        testHelper.assertBigWithPrecision(
          scenario.alternateComparisonPrecision
        )(await getEmergentPriceValue(otherBase.address, otherSecondary.address), 2);
      });
      // TODO
      // eslint-disable-next-line mocha/no-identical-title
      describe('matching can be run independently for different pairs', function() {
        it('WHEN matching the first token pair', async function() {
          await testHelper.waitNBlocks(DEFAULT_MAX_BLOCKS_FOR_TICK);
          await dex.matchOrders(
            doc.address,
            secondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN the first pair is matched', async function() {
          testHelper.assertBigWithPrecision(
            scenario.comparisonPrecision
          )(await getEmergentPriceValue(doc.address, secondary.address), 0);
          testHelper.assertBig(await dex.buyOrdersLength(doc.address, secondary.address), 0);
          testHelper.assertBig(await dex.sellOrdersLength(doc.address, secondary.address), 0);
        });
        it('AND the second pair is not matched', async function() {
          testHelper.assertBigWithPrecision(
            scenario.alternateComparisonPrecision
          )(await getEmergentPriceValue(otherBase.address, otherSecondary.address), 2);
          testHelper.assertBig(
            await dex.buyOrdersLength(otherBase.address, otherSecondary.address),
            1
          );
          testHelper.assertBig(
            await dex.sellOrdersLength(otherBase.address, otherSecondary.address),
            1
          );
        });
        it('AND WHEN matching the second pair', async function() {
          await testHelper.waitNBlocks(DEFAULT_MAX_BLOCKS_FOR_TICK);
          await dex.matchOrders(
            otherBase.address,
            otherSecondary.address,
            testHelper.DEFAULT_STEPS_FOR_MATCHING
          );
        });
        it('THEN the second pair is matched', async function() {
          testHelper.assertBigWithPrecision(
            scenario.alternateComparisonPrecision
          )(await getEmergentPriceValue(otherBase.address, otherSecondary.address), 0);
          testHelper.assertBig(
            await dex.buyOrdersLength(otherBase.address, otherSecondary.address),
            0
          );
          testHelper.assertBig(
            await dex.sellOrdersLength(otherBase.address, otherSecondary.address),
            0
          );
        });
      });
    });
  });
});
