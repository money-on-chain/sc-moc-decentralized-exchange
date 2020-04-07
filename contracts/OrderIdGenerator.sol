pragma solidity 0.5.8;


contract OrderIdGenerator {
  uint256 private lastOrderId;

  /**
    @notice Initializes the contract, like a constructor but usable
    in a proxy-pattern
    @param _seedId Seed to create the ids from
   */
  function initialize(uint256 _seedId) internal {
    lastOrderId = _seedId;
  }

  /**
    @notice Returns the id that a new order should use, and assumes it
    is created afterwards; this ids are unique for each order
  */
  function nextId() internal returns (uint256) {
    ++lastOrderId;
    return lastOrderId;
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
