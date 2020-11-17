pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../CommissionManager.sol";


/**
  @notice Changer to change the minimum commission used in USD in the MoC Decentralized Exchange
 */
contract MinimumCommissionChanger is ChangeContract {
  CommissionManager public commissionManager;
  uint256 public minimumCommission;

  /**
    @notice Initialize the changer.
    @param _commissionManager Address of the commission manager to change
    @param _minimumCommission New minimum commission to be set in USD.
   */
  constructor(CommissionManager _commissionManager, uint256 _minimumCommission) public {
    commissionManager = _commissionManager;
    minimumCommission = _minimumCommission;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    commissionManager.setMinimumCommission(minimumCommission);
  }
}
