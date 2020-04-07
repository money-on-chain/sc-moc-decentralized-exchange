pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";


/**
  @notice Changer to change the expected orders for tick in the MoC Decentralized Exchange
 */
contract ExpectedOrdersForTickChanger is ChangeContract {
  TokenPairListing public tokenPair;
  uint64 public expectedOrdersForTick;

  /**
    @notice Initialize the changer.
    @param _tokenPair Address of the tokenPairListing to change(dex)
    @param _expectedOrdersForTick New expected order for tick. Should be higher or equal than two as it will fail in dex
   */
  constructor(TokenPairListing _tokenPair, uint64 _expectedOrdersForTick) public {
    tokenPair = _tokenPair;
    expectedOrdersForTick = _expectedOrdersForTick;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPair.setExpectedOrdersForTick(expectedOrdersForTick);
  }
}
