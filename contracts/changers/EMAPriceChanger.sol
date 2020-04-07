pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";


/**
  @notice Changer to change the enable a token pair in the MoC Decentralized Exchange
 */
contract EMAPriceChanger is ChangeContract {
  TokenPairListing public tokenPairListing;
  address public baseToken;
  address public secondaryToken;
  uint256 public EMAPrice;

  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _baseToken Address of the base token of the pair
    @param _secondaryToken Address of the secondary token of the pair
  */
  constructor(TokenPairListing _tokenPairListing, address _baseToken, address _secondaryToken, uint256 _EMAPrice) public {
    tokenPairListing = _tokenPairListing;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
    EMAPrice = _EMAPrice;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.setTokenPairEMAPrice(baseToken, secondaryToken, EMAPrice);
  }
}
