pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";

/**
  @notice Changer to change the last closing price of a given pair in the MoC Decentralized Exchange
 */
contract LastClosingPriceChanger is ChangeContract{
  TokenPairListing public tokenPairListing;
  address public baseToken;
  address public secondaryToken;
  uint256 public price;
  uint64 public newMaxBlocksForTick;

  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _baseToken Address of the base token of the pair
    @param _secondaryToken Address of the secondary token of the pair
    @param _price New price to set[base/secondary]
   */
  constructor (
    TokenPairListing _tokenPairListing,
    address _baseToken,
    address _secondaryToken,
    uint256 _price
  )
  public {
    tokenPairListing = _tokenPairListing;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
    price = _price;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.setLastClosingPrice(baseToken, secondaryToken, price);
  }
}