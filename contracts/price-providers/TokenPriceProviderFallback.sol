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
    bool isOkPrice = isValid && uint256(externalPrice) > 0;
    bytes32 finalPrice = isOkPrice ? externalPrice : fallbackPrice();
    return (finalPrice, true);
  }

  function fallbackPrice() internal view returns (bytes32) {
    uint256 lastNonZeroClosingPrice = dex.getLastNonZeroClosingPrice(baseToken, secondaryToken);
    return bytes32(lastNonZeroClosingPrice);
  }
}
