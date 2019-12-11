pragma solidity 0.5.8;

import "moc---gobernanza/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";

/**
  @notice Changer to change the max blocks for ticks in the MoC Decentralized Exchange
 */
contract MaxBlocksForTickChanger is ChangeContract{
  TokenPairListing public tokenPairListing;
  uint64 public newMaxBlocksForTick;



  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _newMaxBlocksForTick New max blocks for tick.
    Should be higher or equal than the current min blocks for thicks, otherwise it will fail in dex
  */
  constructor  (
    TokenPairListing _tokenPairListing,
    uint64 _newMaxBlocksForTick
  )
  public {
    tokenPairListing = _tokenPairListing;
    newMaxBlocksForTick = _newMaxBlocksForTick;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.setMaxBlocksForTick(newMaxBlocksForTick);
  }
}