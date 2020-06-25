pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";
import "../MoCDecentralizedExchange.sol";

contract TokenPriceProviderFallback is IPriceProvider {
  IPriceProvider public externalPriceProvider;
  MoCDecentralizedExchange public dex;
  address public baseToken;
  address public secondaryToken;

  constructor(
    IPriceProvider _externalPriceProvider,
    MoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public {
    externalPriceProvider = _externalPriceProvider;
    dex = _dex;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  function peek() external view returns (bytes32, bool) {
    (bytes32 externalPrice, bool isValid) = externalPriceProvider.peek();
    bytes32 finalPrice = isValid ? externalPrice : fallbackPrice();
    return (finalPrice, true);
  }

  function fallbackPrice() internal view returns (bytes32) {
    uint256 lastClosingPrice = dex.getLastClosingPrice(baseToken, secondaryToken);
    return bytes32(lastClosingPrice);
  }
}
