/* eslint-disable mocha/no-async-describe */
/* eslint-disable mocha/no-identical-title */

const { expect } = require('chai');
const { BN } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('truncate price matching tests', function() {
  let dex;
  let base;
  let secondary;
  let wadify;
  let testHelper;

  const initContractsAndAllowance = props => async () => {
    testHelper = testHelperBuilder();
    ({ wadify } = testHelper);
    [dex, base, secondary] = await Promise.all([
      testHelper.getDex(),
      testHelper.getBase(),
      testHelper.getSecondary()
    ]);
    await testHelper.setBalancesAndAllowances(props);
  };
  contract('simple match, both orders filled with truncated price', function(accounts) {
    before(
      initContractsAndAllowance({
        userData: {
          '1': { baseAllowance: 20, baseBalance: 20, secondaryBalance: 20, secondaryAllowance: 20 },
          '2': { baseAllowance: 20, baseBalance: 20, secondaryBalance: 20, secondaryAllowance: 20 }
        },
        accounts
      })
    );
    let tx;
    let matchEvent;
    it('GIVEN there are is one sell order with the absolute minimum price', async function() {
      await dex.insertSellLimitOrder(base.address, secondary.address, wadify(2), new BN(1), 5, {
        from: accounts[1]
      });
    });
    it('AND there is one buy order that match the sell order 1v1', async function() {
      await dex.insertBuyLimitOrder(base.address, secondary.address, wadify(10), new BN(10), 5, {
        from: accounts[2]
      });
    });
    it('WHEN instructed to match orders, and the price is below the min precision', async function() {
      tx = await dex.matchOrders(
        base.address,
        secondary.address,
        testHelper.DEFAULT_STEPS_FOR_MATCHING
      );
    });
    it('THEN one BuyerMatch event is emitted', async function() {
      const matchEvents = testHelper.findEvents(tx, 'BuyerMatch');
      expect(matchEvents).to.have.lengthOf(1, 'only one event expected');
      [matchEvent] = matchEvents;
    });
    it('AND the BuyerMatch has the price truncated', async function() {
      testHelper.assertBig(matchEvent.matchPrice, new BN(5), 'price');
    });
  });
});
