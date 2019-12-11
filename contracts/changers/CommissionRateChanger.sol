pragma solidity 0.5.8;

import "moc---gobernanza/contracts/Governance/ChangeContract.sol";

import "../CommissionManager.sol";


/**
  @notice Changer to change the commission rate used in the MoC Decentralized Exchange
 */
contract CommissionRateChanger is ChangeContract{
  CommissionManager public commissionManager;
  uint256 public commissionRate;

  /**
    @notice Initialize the changer.
    @param _commissionManager Address of the commission manager to change
    @param _commissionRate New commission rate to be set. Must be between 0 and 1(RATE_PRECISION)
   */
  constructor (
    CommissionManager _commissionManager,
    uint256 _commissionRate
  )
  public {
    commissionManager = _commissionManager;
    commissionRate = _commissionRate;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    commissionManager.setCommissionRate(commissionRate);
  }
}