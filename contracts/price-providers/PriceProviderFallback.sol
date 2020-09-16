pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";
import "../MoCDecentralizedExchange.sol";

/**
  @notice if the main price source is not available, falls back to dex
          getLastClosingPrice method for the given pair
  @dev This is an abstract contract as failablePeek() should be overriten
  FIXME: if bumping to solidity 0.6, add "abstract" and "virtual" reserved words for readability
*/
contract PriceProviderFallback is IPriceProvider {
  MoCDecentralizedExchange public dex;
  address public baseToken;
  address public secondaryToken;

  /**
    @param _dex contract to query for getLastClosingPrice fo the given pair
    @param _baseToken base token of the pair to get the price from
    @param _secondaryToken secondary token of the pair to get the price from
  */
  constructor(    
    MoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public {
    dex = _dex;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  /**
    @notice main source of this pair price
    @return the price and true/false whether it's valid or not 
  */
  function failablePeek() internal view returns (bytes32, bool);

  /**
    @dev quesries for failablePeek, and if get's and not valid price
         falls back to the getLastClosingPrice price
    @return the price, always true.
  */
  function peek() external view returns (bytes32, bool) {
    (bytes32 price, bool isValid) = failablePeek();
    bytes32 finalPrice = isValid ? price : fallbackPrice();
    return (finalPrice, true);
  }

  function fallbackPrice() internal view returns (bytes32) {
    uint256 lastClosingPrice = dex.getLastClosingPrice(baseToken, secondaryToken);
    return bytes32(lastClosingPrice);
  }
}
