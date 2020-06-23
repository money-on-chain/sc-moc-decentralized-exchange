pragma solidity 0.5.8;

import "areopagus/contracts/Governance/ChangeContract.sol";

import "../TokenPairListing.sol";


/**
  @notice Changer to change the price provider of a token pair
 */
contract PriceProviderChanger is ChangeContract {
  TokenPairListing public tokenPairListing;
  address public baseToken;
  address public secondaryToken;
  address public priceProvider;

  /**
    @notice Initialize the changer.
    @param _tokenPairListing Address of the tokenPairListing to change(dex)
    @param _baseToken Address of the base token of the pair
    @param _priceProvider Address of the price provider
  */
  constructor(
    TokenPairListing _tokenPairListing,
    address _baseToken,
    address _secondaryToken,
    address _priceProvider
  ) public {
    tokenPairListing = _tokenPairListing;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
    priceProvider = _priceProvider;
  }

  /**
    @notice Function intended to be called by the governor when ready to run
  */
  function execute() external {
    tokenPairListing.setPriceProvider(baseToken, secondaryToken, priceProvider);
  }
}
