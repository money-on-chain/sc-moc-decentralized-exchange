/* eslint-disable mocha/no-identical-title */
const testHelperBuilder = require('./testHelpers/testHelper');

const HARDCODED_BUY_PRICE = 1.5;
const HARDCODED_SELL_PRICE = 1.4;

describe('multiple tokens tests - emergent price', function() {
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
  let testHelper;

  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify, pricefy, DEFAULT_PRICE_PRECISION, DEFAULT_MAX_BLOCKS_FOR_TICK } = testHelper);
  });
  const initContractsAndAllowance = async accounts => {
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

    [dex, doc, secondary, otherBase, otherSecondary, governor] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      OwnerBurnableToken.new(),
      OwnerBurnableToken.new(),
      testHelper.getGovernor()
    ]);
    await testHelper.setBalancesAndAllowances({ accounts });
    dex = await testHelper.decorateGetOrderAtIndex(dex);
    getEmergentPriceValue = async (baseAddress, secondaryAddress) =>
      (await dex.getEmergentPrice.call(baseAddress, secondaryAddress)).emergentPrice;
    dex = await testHelper.decorateGovernedSetters(dex);
    dex = await testHelper.decorateGetOrderAtIndex(dex);
    const userData = {
      '1': {
        baseAllowance: 1000000000000000000000, // this is specified with precision 18
        baseBalance: 1000000000000000000000 // and doesnt matter, it just needs to be a big number
      },
      '2': {
        secondaryBalance: 1000000000000000000000,
        secondaryAllowance: 1000000000000000000000
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
  };

  contract('The matching should be independent for two token pairs using MO', function(accounts) {
    const [, buyer, seller] = accounts;
    before('GIVEN the user has balance and allowance on all the tokens', async function() {
      await initContractsAndAllowance(accounts);
    });
    describe('AND there are only orders in two token pairs', function() {
      const multiplyFactor01 = 1;
      const multiplyFactor02 = 2;
      const averagePrice = (HARDCODED_BUY_PRICE + HARDCODED_SELL_PRICE) / 2;
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
          wadify(10),
          pricefy(multiplyFactor01),
          10,
          true,
          {
            from: buyer
          }
        );
        await dex.insertMarketOrder(
          doc.address,
          secondary.address,
          wadify(10),
          pricefy(multiplyFactor01),
          10,
          false,
          {
            from: seller
          }
        );
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
          pricefy(multiplyFactor02),
          10,
          true,
          {
            from: buyer
          }
        );
        await dex.insertMarketOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(multiplyFactor02),
          10,
          false,
          {
            from: seller
          }
        );
      });
      describe('Emergent price is generated independently for two token pairs', function() {
        it('WHEN calling getEmergentPrice, THEN the emergent prices are independent', async function() {
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, secondary.address),
            averagePrice * multiplyFactor01
          );
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, otherSecondary.address),
            averagePrice * multiplyFactor02
          );
        });
      });
      // TODO: unskip the following test after MATCHING MO development
      describe.skip('matching can be run independently for different pairs', function() {
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
            const { emergentPrice } = await dex.getPageMemory.call(
              ...[doc.address, secondary.address]
            );
            await testHelper.assertBigPrice(emergentPrice, averagePrice * multiplyFactor01);
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, secondary.address), 0);
            await testHelper.assertBig(dex.sellOrdersLength(doc.address, secondary.address), 0);
          });
          it('AND the other pair is not matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, otherSecondary.address),
              averagePrice * multiplyFactor02
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
      await initContractsAndAllowance(accounts);
    });
    describe('AND there are only orders in two token pairs', function() {
      const multiplyFactor01 = 1;
      const multiplyFactor02 = 2;
      const buyLOPrice1 = 1.5;
      const sellLOPrice2 = 3;
      const averagePrice1 = (buyLOPrice1 + HARDCODED_SELL_PRICE * multiplyFactor01) / 2;
      const averagePrice2 = (sellLOPrice2 + HARDCODED_BUY_PRICE * multiplyFactor02) / 2;
      before(async function() {
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION.toString(),
          DEFAULT_PRICE_PRECISION.toString(),
          governor
        );
        await dex.insertBuyOrder(
          doc.address,
          secondary.address,
          wadify(1),
          pricefy(buyLOPrice1),
          10,
          {
            from: buyer
          }
        );
        await dex.insertMarketOrder(
          doc.address,
          secondary.address,
          wadify(10),
          pricefy(multiplyFactor01),
          10,
          false,
          {
            from: seller
          }
        );
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
          pricefy(multiplyFactor02 - 0.1),
          10,
          true,
          {
            from: buyer
          }
        );
        await dex.insertMarketOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(multiplyFactor02),
          10,
          true,
          {
            from: buyer
          }
        );
        await dex.insertSellOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(sellLOPrice2),
          5,
          {
            from: seller
          }
        );
        await dex.insertSellOrder(
          doc.address,
          otherSecondary.address,
          wadify(1),
          pricefy(sellLOPrice2 + 0.1),
          5,
          {
            from: seller
          }
        );
      });
      describe('Emergent price is generated independently for two token pairs', function() {
        it('WHEN calling getEmergentPrice, THEN the emergent prices are independent', async function() {
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, secondary.address),
            averagePrice1
          );
          await testHelper.assertBigPrice(
            getEmergentPriceValue(doc.address, otherSecondary.address),
            averagePrice2
          );
        });
      });
      // TODO: unskip the following test after MATCHING MO development
      describe.skip('matching can be run independently for different pairs', function() {
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
            const { emergentPrice } = await dex.getPageMemory.call(
              ...[doc.address, secondary.address]
            );
            await testHelper.assertBigPrice(emergentPrice, averagePrice1);
            await testHelper.assertBig(dex.buyOrdersLength(doc.address, secondary.address), 0);
            await testHelper.assertBig(dex.sellOrdersLength(doc.address, secondary.address), 0);
          });
          it('AND the other pair is not matched', async function() {
            await testHelper.assertBigPrice(
              getEmergentPriceValue(doc.address, otherSecondary.address),
              averagePrice2
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
});
