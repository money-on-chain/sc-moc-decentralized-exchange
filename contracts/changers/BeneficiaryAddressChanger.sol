pragma solidity 0.5.8;

import "moc---gobernanza/contracts/Governance/ChangeContract.sol";

import "../CommissionManager.sol";

/**
  @notice Changer that changes the beneficiary address of the commissions of MoC Decentralized Exchange
*/
contract BeneficiaryAddressChanger is ChangeContract{
  CommissionManager public commissionManager;
  address public beneficiaryAddress;

  /**
    @notice Initialize the changer.
    @param _commissionManager Address of the commission manager to change
    @param _beneficiaryAddress New beneficiary address. Should not be 0 as it will fail in dex
   */
  constructor (
    CommissionManager _commissionManager,
    address _beneficiaryAddress
  )
  public {
    commissionManager = _commissionManager;
    beneficiaryAddress = _beneficiaryAddress;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    commissionManager.setBeneficiaryAddress(beneficiaryAddress);
  }
}