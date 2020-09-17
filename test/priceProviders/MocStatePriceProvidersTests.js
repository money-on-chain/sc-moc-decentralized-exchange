const testHelperBuilder = require('../testHelpers/testHelper');

const DEFAULT_INITIAL_PRICE = 10;
const DEFAULT_BTC_PRICE = 9000;
let testHelper;
let pricefy;
let wadify;
let externalProvider;
let assertMarketPrice;
let assertBigPrice;

const decorateCreateNewPair = (dex, governor) =>
  Object.assign({}, dex, {
    createNewPair: createNewPair(dex, governor)
  });

const createNewPair = (dex, governor) =>
  async function(pair, priceProvider, lastClosingPrice) {
    await dex.addTokenPair(
      ...pair,
      priceProvider.address,
      pricefy(1),
      pricefy(lastClosingPrice),
      governor
    );
  };

describe('Moc State provider with fallback tests', function() {
  let doc;
  let dex;
  let secondary;
  let governor;
  // [base.address, secondary.address] handy setup to improve readability
  let pair;

  const setContracts = async accounts => {
    testHelper = testHelperBuilder();
    ({ pricefy, wadify, assertMarketPrice, assertBigPrice } = testHelper);
    await testHelper.createContracts({
      owner: accounts[0],
      ordersForTick: 2,
      maxBlocksForTick: 2,
      minBlocksForTick: 1
    });
    [dex, doc, secondary, governor, externalProvider] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary(),
      testHelper.getGovernor(),
      testHelper.getTokenPriceProviderFake().new()
    ]);

    pair = [doc.address, secondary.address];

    dex = testHelper.decorateGovernedSetters(dex);
    dex = decorateCreateNewPair(dex, governor);

    await externalProvider.poke(pricefy(DEFAULT_BTC_PRICE));

    // Create MocStateFake with externalProvider as Bitcoin Price source
    // Total BTC amount [using reservePrecision]
    const nB = wadify(10);
    // nDoc Doc amount [using mocPrecision]
    // this will yield lb of 4, as lb = nDoc/BtcPrice
    const nDoc = wadify(4 * DEFAULT_BTC_PRICE);
    // nTP BPro amount [using mocPrecision]
    const nTP = wadify(2);
    // TPbtc = (nB-LB) / nTP = (10-4) / 2 = 3
    mocState = await testHelper.getMocStateFake().new(externalProvider.address, nB, nDoc, nTP);
  };

  let mocState;
  let priceProvider;
  describe('RULE: MocBproUsdPriceProvider should return BproUsd price', function() {
    contract('GIVEN Doc/Bpro pair is set tu use MocBproUsdPriceProvider', function(accounts) {
      before(async function() {
        await setContracts(accounts);
        priceProvider = await testHelper
          .getMocBproUsdPriceProviderFallback()
          .new(mocState.address, dex.address, ...pair);

        await dex.createNewPair(pair, priceProvider, DEFAULT_INITIAL_PRICE);
      });
      describe('AND Moc Oracle has no valid price', function() {
        before(async function() {
          await externalProvider.pokeValidity(false);
        });
        it('THEN the market price should be de default as it fallbacks', async function() {
          await assertMarketPrice(priceProvider, DEFAULT_INITIAL_PRICE);
        });
      });
      describe('AND Moc Oracle has a valid price', function() {
        before(async function() {
          await externalProvider.pokeValidity(true);
        });
        it('THEN the market price for the pair should be oracles times TechPrice', async function() {
          // Assert all the prices are in place
          const expectedTPbtc = 3;
          await assertBigPrice(await mocState.bproTecPrice(), expectedTPbtc);
          await assertMarketPrice(externalProvider, DEFAULT_BTC_PRICE);
          await assertBigPrice(await mocState.getBitcoinPrice(), DEFAULT_BTC_PRICE);
          await assertBigPrice(await mocState.bproUsdPrice(), DEFAULT_BTC_PRICE * expectedTPbtc);

          // bproUsdPrice = TPbtc * BtcUsd = 3 * 9k = 27k
          await assertMarketPrice(priceProvider, DEFAULT_BTC_PRICE * expectedTPbtc);
        });
      });
    });
  });
});
