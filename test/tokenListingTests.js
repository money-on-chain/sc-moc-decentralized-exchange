const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

const MoCDecentralizedExchange = artifacts.require('MoCDecentralizedExchange');
const CommissionManager = artifacts.require('CommissionManager');
const DocToken = artifacts.require('DocToken');
const WRBTC = artifacts.require('WRBTC');
const OwnerBurnableToken = artifacts.require('OwnerBurnableToken');

let doc;
let wrbtc;
let dex;
let secondary;
let thirdToken;
let governor;
let stopper;
let newBase;
let newSecondary;
let user;
let commissionManager;

const testHelper = testHelperBuilder();
const { wadify, pricefy } = testHelper;

const MIN_ORDER_AMOUNT = '0';
const MAX_ORDER_LIFESPAN = 10;
const ORDERS_FOR_TICK = 8;
const MAX_BLOCKS_FOR_TICK = 12;
const MIN_BLOCKS_FOR_TICK = 4;
const DEFAULT_PRICE_PRECISION = (10 ** 4).toString();
const COMMISSION_RATE = '0';
const ERROR_MSG_ALREADY_INITIALIZED = 'Contract instance has already been initialized.';
const ERROR_MSG_INVALID_BASE_TOKEN = 'Invalid Pair';
const ERROR_MSG_PAIR_DOESNT_EXIST = 'Token pair does not exist';
const ERROR_MSG_PAIR_ALREADY_EXISTS = 'Existent pair';
const ERROR_MSG_PAIR_INVERSE_ALREADY_EXISTS = 'Existent inverse pair';
const ERROR_MSG_BASE_EQUAL_TO_SECONDARY = 'Base equal to secondary';

const setContracts = async function() {
  [
    dex,
    commissionManager,
    wrbtc,
    doc,
    secondary,
    thirdToken,
    governor,
    stopper
  ] = await Promise.all([
    // default migrations initializes the contract
    MoCDecentralizedExchange.new(),
    CommissionManager.new(),
    WRBTC.new(),
    DocToken.new(),
    OwnerBurnableToken.new(),
    OwnerBurnableToken.new(),
    testHelper.getGovernor(),
    testHelper.getStopper()
  ]);
};
const initializeDex = async function(temporaryOwner, beneficiaryAddress) {
  await setContracts();
  await commissionManager.initialize(
    beneficiaryAddress,
    COMMISSION_RATE,
    COMMISSION_RATE,
    COMMISSION_RATE,
    governor.address,
    temporaryOwner
  );
  await dex.initialize(
    doc.address,
    commissionManager.address,
    ORDERS_FOR_TICK,
    MAX_BLOCKS_FOR_TICK,
    MIN_BLOCKS_FOR_TICK,
    MIN_ORDER_AMOUNT,
    MAX_ORDER_LIFESPAN,
    governor.address,
    stopper.address
  );
  await commissionManager.transferOwnership(dex.address, { from: temporaryOwner });
  dex = testHelper.decorateGovernedSetters(dex);
};

describe('token listing tests', function() {
  contract('contract can only be initialized once', function(accounts) {
    before(setContracts);
    it('GIVEN the contract is initialized', function() {
      return initializeDex(accounts[0], accounts[1]);
    });
    it('WHEN trying to initialize it again, THEN it should revert', async function() {
      await expectRevert(
        dex.initialize(
          doc.address,
          commissionManager.address,
          ORDERS_FOR_TICK,
          MAX_BLOCKS_FOR_TICK,
          MIN_BLOCKS_FOR_TICK,
          MIN_ORDER_AMOUNT,
          MAX_ORDER_LIFESPAN,
          governor.address,
          stopper.address
        ),
        ERROR_MSG_ALREADY_INITIALIZED
      );
    });
  });

  contract('listing a token pair and then inserting an order: happy path', function(accounts) {
    before(async function() {
      await initializeDex(accounts[0], accounts[1]);
      user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
    });
    it('GIVEN there are 0 token pairs listed', async function() {
      testHelper.assertBig(await dex.tokenPairCount(), 0);
    });
    it('WHEN listing a token pair', async function() {
      await dex.addTokenPair(
        doc.address,
        secondary.address,
        DEFAULT_PRICE_PRECISION,
        DEFAULT_PRICE_PRECISION,
        governor
      );
    });
    it('THEN there is one token pair listed', async function() {
      testHelper.assertBig(await dex.tokenPairCount(), 1);
    });
    describe('GIVEN the user has balance and allowance', function() {
      before(async function() {
        await testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary,
          userData: null,
          accounts
        });
      });
      it('WHEN a buy order is inserted for that pair', async function() {
        await dex.insertBuyLimitOrder(doc.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
      });
      it('THEN the buy orderbook for that pair has length 1', async function() {
        testHelper.assertBig(await dex.buyOrdersLength(doc.address, secondary.address), 1);
      });
      it('AND WHEN a sell order is inserted for that pair', async function() {
        await dex.insertSellLimitOrder(doc.address, secondary.address, wadify(1), pricefy(1), 5, {
          from: user
        });
      });
      it('THEN the sell orderbook for that pair has length 1', async function() {
        testHelper.assertBig(await dex.sellOrdersLength(doc.address, secondary.address), 1);
      });
    });
  });

  contract('listing two token pair and then inserting an order: happy path', function(accounts) {
    newBase = secondary;
    newSecondary = thirdToken;
    before(async function() {
      await initializeDex(accounts[0], accounts[1]);
      user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
      newBase = secondary;
      newSecondary = thirdToken;
    });
    it('GIVEN there is a token pair listed', async function() {
      await dex.addTokenPair(
        doc.address,
        secondary.address,
        DEFAULT_PRICE_PRECISION,
        DEFAULT_PRICE_PRECISION,
        governor
      );
    });
    it('WHEN listing a second token pair in which the base can be converted back to doc', async function() {
      await dex.addTokenPair(
        newBase.address,
        newSecondary.address,
        DEFAULT_PRICE_PRECISION,
        DEFAULT_PRICE_PRECISION,
        governor
      );
    });
    it('THEN there are two token pairs listed', async function() {
      testHelper.assertBig(await dex.tokenPairCount(), 2);
    });
    describe('GIVEN the user has balance and allowance set', function() {
      before(async function() {
        await testHelper.setBalancesAndAllowances({
          dex,
          base: newBase,
          secondary: newSecondary,
          userData: null,
          accounts
        });
      });
      it('WHEN a buy order is inserted for that pair', async function() {
        await dex.insertBuyLimitOrder(
          newBase.address,
          newSecondary.address,
          wadify(1),
          pricefy(1),
          5,
          {
            from: user
          }
        );
      });
      it('THEN the buy orderbook for that pair has length 1', async function() {
        testHelper.assertBig(await dex.buyOrdersLength(newBase.address, newSecondary.address), 1);
      });
      it('AND WHEN a sell order is inserted for that pair', async function() {
        await dex.insertSellLimitOrder(
          newBase.address,
          newSecondary.address,
          wadify(1),
          pricefy(1),
          5,
          {
            from: user
          }
        );
      });
      it('THEN the sell orderbook for that pair has length 1', async function() {
        testHelper.assertBig(await dex.sellOrdersLength(newBase.address, newSecondary.address), 1);
      });
    });
  });

  contract(
    'listing a token pair: base token is not DOC and the pair DOC-token does not exist',
    function(accounts) {
      before(setContracts);
      it('GIVEN the dex contract is initialized', function() {
        return initializeDex(accounts[0], accounts[1]);
      });
      it('WHEN trying to add a token pair with an invalid base token, THEN it should revert', async function() {
        await expectRevert(
          dex.addTokenPair(
            wrbtc.address,
            secondary.address,
            DEFAULT_PRICE_PRECISION,
            DEFAULT_PRICE_PRECISION,
            governor
          ),
          ERROR_MSG_INVALID_BASE_TOKEN
        );
      });
      it('BUT WHEN the DOC-token pair is added', async function() {
        await dex.addTokenPair(
          doc.address,
          wrbtc.address,
          DEFAULT_PRICE_PRECISION,
          DEFAULT_PRICE_PRECISION,
          governor
        );
      });
      it('AND the DOC-secondary pair is added', async function() {
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION,
          DEFAULT_PRICE_PRECISION,
          governor
        );
      });
      it('THEN the token pair is valid', async function() {
        await dex.addTokenPair(
          wrbtc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION,
          DEFAULT_PRICE_PRECISION,
          governor
        );
      });
    }
  );

  contract('listing a token pair: Base equal to secondary', function(accounts) {
    describe('GIVEN the dex contract is initialized', function() {
      before(async function() {
        await setContracts();
        await initializeDex(accounts[0], accounts[1]);
      });
      it('WHEN trying to add a DOC-DOC token pair, THEN it should revert', function() {
        return expectRevert(
          dex.addTokenPair(
            doc.address,
            doc.address,
            DEFAULT_PRICE_PRECISION,
            DEFAULT_PRICE_PRECISION,
            governor
          ),
          ERROR_MSG_BASE_EQUAL_TO_SECONDARY
        );
      });
    });
  });

  contract('listing a token pair: the dex contract is not initialized', function() {
    describe('GIVEN the dex contract is not initialized', function() {
      before(setContracts);
      it('WHEN trying to add a token pair, THEN it should revert', async function() {
        await expectRevert.unspecified(
          dex.addTokenPair(
            doc.address,
            secondary.address,
            DEFAULT_PRICE_PRECISION,
            DEFAULT_PRICE_PRECISION,
            governor
          )
        );
      });
    });
  });

  contract('Dex: Listing Pair test', function(accounts) {
    describe('GIVEN there is a token pair listed', function() {
      before(async function() {
        await initializeDex(accounts[0], accounts[1]);
        user = accounts[testHelper.DEFAULT_ACCOUNT_INDEX];
        await testHelper.setBalancesAndAllowances({
          dex,
          base: doc,
          secondary,
          userData: null,
          accounts
        });
        await dex.addTokenPair(
          doc.address,
          secondary.address,
          DEFAULT_PRICE_PRECISION,
          DEFAULT_PRICE_PRECISION,
          governor
        );
      });
      it('WHEN a buy order is inserted with an invalid base token, THEN it should revert', async function() {
        await expectRevert(
          dex.insertBuyLimitOrder(dex.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          ERROR_MSG_PAIR_DOESNT_EXIST
        );
      });
      it('WHEN a sell order is inserted with an invalid base token, THEN it should revert', async function() {
        await expectRevert(
          dex.insertSellLimitOrder(dex.address, secondary.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          ERROR_MSG_PAIR_DOESNT_EXIST
        );
      });
      it('WHEN a buy order is inserted with an invalid secondary token, THEN it should revert', function() {
        return expectRevert(
          dex.insertBuyLimitOrder(doc.address, dex.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          ERROR_MSG_PAIR_DOESNT_EXIST
        );
      });
      it('WHEN a sell order is inserted with an invalid secondary token, THEN it should revert', function() {
        return expectRevert(
          dex.insertSellLimitOrder(doc.address, dex.address, wadify(1), pricefy(1), 5, {
            from: user
          }),
          ERROR_MSG_PAIR_DOESNT_EXIST
        );
      });
      it('WHEN trying to list the same pair again THEN it should revert', function() {
        // change precision
        return expectRevert(
          dex.addTokenPair(
            doc.address,
            secondary.address,
            (10 ** 5).toString(),
            (10 ** 5).toString(),
            governor
          ),
          ERROR_MSG_PAIR_ALREADY_EXISTS
        );
      });
      it('WHEN trying to list the inverse pair again THEN it should revert', function() {
        // change precision
        return expectRevert(
          dex.addTokenPair(
            secondary.address,
            doc.address,
            (10 ** 5).toString(),
            (10 ** 5).toString(),
            governor
          ),
          ERROR_MSG_PAIR_INVERSE_ALREADY_EXISTS
        );
      });
    });
  });
});
