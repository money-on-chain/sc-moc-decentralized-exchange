const { expectRevert } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

describe('Commission manager protectedness functions tests', function() {
  let commissionManager;
  let base;
  let testHelper;
  let wadify;
  before(async function() {
    testHelper = testHelperBuilder();
    ({ wadify } = testHelper);
    [commissionManager, base] = await Promise.all([
      testHelper.getCommissionManager(),
      testHelper.getBase()
    ]);
  });

  const testCommissionManager = function({ action, functionName, getParams }) {
    return function() {
      contract(`RULE: only dex is allowed to ${action}`, function([dexOwner, account]) {
        describe('GIVEN that there is a commission manager', function() {
          describe(`WHEN ${functionName} is called with the dexOwner`, function() {
            it('THEN the tx reverts because of the protectedness of the commission manager', function() {
              // Unspecified because the onlyOwner of openzeppelin-eth doesnt throw a message
              return expectRevert.unspecified(
                commissionManager[functionName](...getParams(), { from: dexOwner })
              );
            });
          });
          describe(`WHEN ${functionName} is called with the another account`, function() {
            it('THEN the tx reverts because of the protectedness of the commission manager', function() {
              // Unspecified because the onlyOwner of openzeppelin-eth doesnt throw a message
              return expectRevert.unspecified(
                commissionManager[functionName](...getParams(), { from: account })
              );
            });
          });
        });
      });
    };
  };

  describe(
    'Charge commission for match',
    testCommissionManager({
      action: 'charge commission for match',
      functionName: 'chargeCommissionForMatch',
      getParams: () => [wadify(10), wadify(10), wadify(1), base.address]
    })
  );

  describe(
    'Charge exceptional commission',
    testCommissionManager({
      action: 'charge exceptional commission',
      functionName: 'chargeExceptionalCommission',
      getParams: () => [wadify(10), base.address, true]
    })
  );

  describe(
    'Clear exchange commissions',
    testCommissionManager({
      action: 'clear exchange commissions',
      functionName: 'clearExchangeCommissions',
      getParams: () => [base.address]
    })
  );
});
