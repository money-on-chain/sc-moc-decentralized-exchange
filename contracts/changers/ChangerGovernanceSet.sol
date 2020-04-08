pragma solidity 0.5.8;

import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "zos-lib/contracts/upgradeability/ProxyAdmin.sol";
import "areopagus/contracts/Governance/ChangeContract.sol";
import "areopagus/contracts/Upgradeability/UpgradeDelegator.sol";
import "areopagus/contracts/Stopper/Stoppable.sol";
import "../MoCDecentralizedExchange.sol";


/**
  @notice Changer that adds one or more pair of tokens to be listed in the MoC Decentralized Exchange
*/
contract ChangerGovernanceSet is ChangeContract {
  MoCDecentralizedExchange public dex;
  IGovernor public newGovernor;
  address public newStopper;
  UpgradeDelegator public oldDelegator;
  address payable public newProxyAdmin;

  /**
    @notice Initialize the changer Each list must have the same length and have related
    data in the same index
    @param _dex Address of the main contract of the suite to change
    @param _newGovernor Address of the new governor
    @param _newStopper Address of the new stopper
    @param _oldDelegator Address of the current delegator of the contracts
    @param _newProxyAdmin Address of the new proxy admin
  */
  constructor(
    MoCDecentralizedExchange _dex,
    IGovernor _newGovernor,
    address _newStopper,
    UpgradeDelegator _oldDelegator,
    address payable _newProxyAdmin
  ) public {
    dex = _dex;
    newGovernor = _newGovernor;
    newStopper = _newStopper;
    oldDelegator = _oldDelegator;
    newProxyAdmin = _newProxyAdmin;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    CommissionManager commissionManager = dex.commissionManager();
    address payable dexAddress = address(uint160(address(dex)));
    address payable commissionManagerAddress = address(uint160(address(commissionManager)));

    oldDelegator.changeProxyAdmin(AdminUpgradeabilityProxy(commissionManagerAddress), newProxyAdmin);
    require(false, "faa");
    commissionManager.changeIGovernor(newGovernor);

    oldDelegator.changeProxyAdmin(AdminUpgradeabilityProxy(dexAddress), newProxyAdmin);
    dex.setStopper(newStopper);
    dex.changeIGovernor(newGovernor);
  }
}
