const testHelperBuilder = require('./testHelpers/testHelper');

const ChangerGovernanceSet = artifacts.require('ChangerGovernanceSet');

const Governor = artifacts.require('Governor');
const Stopper = artifacts.require('Stopper');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const UpgradeDelegator = artifacts.require('UpgradeDelegator');

let oldGovernor;
let oldStopper;
let oldDelegator;
let oldProxyAdmin;

let commissionManager;
let dex;

let newGovernor;
let newStopper;
let newDelegator;
let newProxyAdmin;

let changerGovernanceSet;

const setContracts = async function(owner) {
  const testHelper = testHelperBuilder();

  [
    oldGovernor,
    oldStopper,
    oldDelegator,
    oldProxyAdmin,
    commissionManager,
    dex,
    newGovernor,
    newStopper,
    newDelegator,
    newProxyAdmin
  ] = await Promise.all([
    testHelper.getGovernor(),
    testHelper.getStopper(),
    testHelper.getUpgradeDelegator(),
    testHelper.getProxyAdmin(),
    testHelper.getCommissionManager(),
    testHelper.getDex(),
    Governor.new(),
    Stopper.new(),
    UpgradeDelegator.new(),
    ProxyAdmin.new()
  ]);

  await newGovernor.initialize(owner);
  await newDelegator.initialize(newGovernor.address, newProxyAdmin.address);

  // Transfers the ownership of the admin to the upgradeDelegator, so the upgradeDelegator
  // is enabled to forward the upgrade calls
  await newProxyAdmin.transferOwnership(newDelegator.address);

  changerGovernanceSet = await ChangerGovernanceSet.new(
    dex.address,
    newGovernor.address,
    newStopper.address,
    oldDelegator.address,
    newProxyAdmin.address
  );
};
describe.only('Change governance set', function() {
  contract(
    'GIVEN the contract suite has a set of addresses and there is a deployed changer to change them',
    function([owner]) {
      before(function() {
        return setContracts(owner);
      });
      describe('WHEN executing the changer', function() {
        before(async function() {
          console.log(owner);
          console.log(await oldGovernor.owner());
          console.log(await web3.eth.getStorage(commissionManager.address, ''));
          console.log(await web3.eth.getStorage(dex.address, ''));
          console.log(await oldProxyAdmin.address);
          console.log(await new.address);
          return oldGovernor.executeChange(changerGovernanceSet.address, { from: owner });
        });
        it('THEN the new governor of dex is the newly set one', async function() {
          expect(await dex.governor()).to.be.eq(newGovernor.address);
        });

        it('THEN the new stopper of dex is the newly set one', async function() {
          expect(await dex.stopper()).to.be.eq(newStopper.address);
        });

        it('THEN the new governor of the commission manager is the newly set one', async function() {
          expect(await commissionManager.governor()).to.be.eq(newGovernor.address);
        });

        it('THEN it can be changed back', async function() {
          const changerGovernanceSetReverser = await ChangerGovernanceSet.new(
            dex.address,
            oldGovernor.address,
            oldStopper.address,
            newDelegator.address,
            oldProxyAdmin.address
          );

          return newGovernor.executeChange(changerGovernanceSetReverser.address, { gasLimit: 6e8 });
        });
      });
    }
  );
});
