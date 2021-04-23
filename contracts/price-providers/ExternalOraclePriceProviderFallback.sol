pragma solidity 0.5.8;

import "./PriceProviderFallback.sol";
import "../interface/IMoCDecentralizedExchange.sol";

/**
  @notice if the externalPriceProvider price source is not available, falls back
          to dex getLastClosingPrice method for the given pair
*/
contract ExternalOraclePriceProviderFallback is PriceProviderFallback {
  IPriceProvider public externalPriceProvider;

  constructor(
    IPriceProvider _externalPriceProvider,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    externalPriceProvider = _externalPriceProvider;
  }

  function failablePeek() internal view returns (bytes32, bool) {
    return externalPriceProvider.peek();
  }
}
