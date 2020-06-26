pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../RestrictiveOrderListing.sol";

/**
  @notice Changer to change the Market Order settings used in the TEX Platform
 */
contract MarketOrderSettingsChanger is ChangeContract {
  RestrictiveOrderListing public restrictiveOrderListing;
  uint256 public minMultiplyFactor;
  uint256 public maxMultiplyFactor;

  /**
    @notice Initialize the changer.
    @param _minMultiplyFactor Min multiplyFactor using RATE_PRECISION.
    @param _maxMultiplyFactor Max multiplyFactor using RATE_PRECISION.
   */
  constructor(
    RestrictiveOrderListing _restrictiveOrderListing,
    uint256 _minMultiplyFactor,
    uint256 _maxMultiplyFactor
  ) public {
    restrictiveOrderListing = _restrictiveOrderListing;
    minMultiplyFactor = _minMultiplyFactor;
    maxMultiplyFactor = _maxMultiplyFactor;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    restrictiveOrderListing.setMinMultiplyFactor(minMultiplyFactor);
    restrictiveOrderListing.setMaxMultiplyFactor(maxMultiplyFactor);
  }
}
