pragma solidity 0.5.8;

import "../interface/IPriceProvider.sol";
import "../MoCDecentralizedExchange.sol";

contract TokenPriceProviderLastClosingPrice is IPriceProvider {
  MoCDecentralizedExchange public dex;
  address public baseToken;
  address public secondaryToken;

  constructor(
    MoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public {
    dex = _dex;
    baseToken = _baseToken;
    secondaryToken = _secondaryToken;
  }

  function peek() external view returns (bytes32, bool) {
    return doPeek();
  }

  function peekAsUint() external view returns (uint256 lastNonZeroClosingPrice, bool success) {
    (bytes32 binaryPrice, bool isSuccess) = doPeek();
    success = isSuccess;
    lastNonZeroClosingPrice = uint256(binaryPrice);
  }

  function doPeek() internal view returns (bytes32, bool) {
    uint256 lastNonZeroClosingPrice = dex.getLastNonZeroClosingPrice(baseToken, secondaryToken);
    return (bytes32(lastNonZeroClosingPrice), true);
  }
}
