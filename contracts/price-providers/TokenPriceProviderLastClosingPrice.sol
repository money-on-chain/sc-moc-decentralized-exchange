pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";
import "../interface/IMoCDecentralizedExchange.sol";

contract TokenPriceProviderLastClosingPrice is IPriceProvider {
  IMoCDecentralizedExchange public dex;
  address public baseToken;
  address public secondaryToken;

  constructor(
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public {
    dex = _dex;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  function peek() external view returns (bytes32, bool) {
    uint256 lastClosingPrice = dex.getLastClosingPrice(baseToken, secondaryToken);
    return (bytes32(lastClosingPrice), true);
  }
}
