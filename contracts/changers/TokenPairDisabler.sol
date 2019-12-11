pragma solidity 0.5.8;

import "moc---gobernanza/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";

/**
  @notice Changer to disable a token pair in the MoC Decentralized Exchange
 */
contract TokenPairDisabler is ChangeContract{
  TokenPairListing public tokenPairListing;
  address public baseToken;
  address public secondaryToken;

  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _baseToken Address of the base token of the pair
    @param _secondaryToken Address of the secondary token of the pair
  */
  constructor (
    TokenPairListing _tokenPairListing,
    address _baseToken,
    address _secondaryToken
  )
  public {
    tokenPairListing = _tokenPairListing;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.disableTokenPair(baseToken, secondaryToken);
  }
}