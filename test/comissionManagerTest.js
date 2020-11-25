const { expectRevert, constants } = require('openzeppelin-test-helpers');
const testHelperBuilder = require('./testHelpers/testHelper');

const CommissionManager = artifacts.require('CommissionManager');

let governor;
let commissionManager;

const testHelper = testHelperBuilder();
const { wadify } = testHelper;

const COMMISSION_RATE = '0';
const MINIMUM_COMMISSION = '0';
const ERROR_MSG_GOVERNOR_NOT_NULL = 'revert governor cannot be null';
const ERROR_MSG_OWNER_NOT_NULL = 'owner cannot be null';
const ERROR_COMMISSION_RATE = 'commissionRate should to be in relation to 1';
const ERROR_EXPIRATION_RATE = 'expirationPenaltyRate should to be in relation to 1';
const ERROR_CANCELATION_RATE = 'cancelationPenaltyRate should to be in relation to 1';

const setContracts = async function() {
  [commissionManager, governor] = await Promise.all([
    CommissionManager.new(),
    testHelper.getGovernor()
  ]);
};
describe('commission manager test', function() {
  contract('contract can not be initialized with null governor and owner addresses', function([
    owner
  ]) {
    before(setContracts);
    it('WHEN trying to initialize with null governor, THEN it should revert', async function() {
      await expectRevert(
        commissionManager.initialize(
          owner,
          COMMISSION_RATE,
          COMMISSION_RATE,
          COMMISSION_RATE,
          constants.ZERO_ADDRESS,
          owner,
          MINIMUM_COMMISSION
        ),
        ERROR_MSG_GOVERNOR_NOT_NULL
      );
    });
    it('WHEN trying to initialize with null owner, THEN it should revert', async function() {
      await expectRevert(
        commissionManager.initialize(
          owner,
          COMMISSION_RATE,
          COMMISSION_RATE,
          COMMISSION_RATE,
          governor.address,
          constants.ZERO_ADDRESS,
          MINIMUM_COMMISSION
        ),
        ERROR_MSG_OWNER_NOT_NULL
      );
    });
    it('WHEN trying to initialize with commissionRate=10.5, THEN it should revert', async function() {
      await expectRevert(
        commissionManager.initialize(
          owner,
          wadify(10.5),
          COMMISSION_RATE,
          COMMISSION_RATE,
          governor.address,
          owner,
          MINIMUM_COMMISSION
        ),
        ERROR_COMMISSION_RATE
      );
    });
    it('WHEN trying to initialize with cancellationPenaltyRate=10.5, THEN it should revert', async function() {
      await expectRevert(
        commissionManager.initialize(
          owner,
          COMMISSION_RATE,
          '10000000000000000000',
          COMMISSION_RATE,
          governor.address,
          owner,
          MINIMUM_COMMISSION
        ),
        ERROR_CANCELATION_RATE
      );
    });
    it('WHEN trying to initialize with expirationPenaltyRate=10.5, THEN it should revert', async function() {
      await expectRevert(
        commissionManager.initialize(
          owner,
          COMMISSION_RATE,
          COMMISSION_RATE,
          '10000000000000000000',
          governor.address,
          owner,
          MINIMUM_COMMISSION
        ),
        ERROR_EXPIRATION_RATE
      );
    });
  });
});
