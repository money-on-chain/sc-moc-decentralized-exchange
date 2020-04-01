pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";

/**
  @notice Changer to change the min blocks for tick in the MoC Decentralized Exchange
 */
contract MinBlocksForTickChanger is ChangeContract{
  TokenPairListing public tokenPairListing;
  uint64 public newMinBlocksForTick;

  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _newMinBlocksForTick New min blocks for tick
    Should be lower or equal than the current maximum, otherwise it will fail in dex
   */
  constructor  (
    TokenPairListing _tokenPairListing,
    uint64 _newMinBlocksForTick
  )
  public {
    tokenPairListing = _tokenPairListing;
    newMinBlocksForTick = _newMinBlocksForTick;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.setMinBlocksForTick(newMinBlocksForTick);
  }
}