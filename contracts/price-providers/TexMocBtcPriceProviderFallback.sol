pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "./PriceProviderFallback.sol";
import "../interface/IMocState.sol";

/**
  @notice gets the Bitcoin Price from MocState contract
*/
contract TexMocBtcPriceProviderFallback is PriceProviderFallback {
  using SafeMath for uint256;
  IMocState public mocState;
  address public baseTokenDocMoc;
  address public secondaryTokenDocMoc;
  uint256 public constant RATE_PRECISION = uint256(10**18);

  constructor(
    IMocState _mocState,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken,
    address _baseTokenDocMoc,
    address _secondaryTokenDocMoc
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocState = _mocState;
    baseTokenDocMoc = _baseTokenDocMoc;
    secondaryTokenDocMoc = _secondaryTokenDocMoc;
  }

  function failablePeek() internal view returns (bytes32, bool) {
    // MocState BtcPriceProvider is complient with IPriceProvider interface
    IPriceProvider priceProvider = IPriceProvider(mocState.getBtcPriceProvider());
    (bytes32 btcPrice, bool isValid) = priceProvider.peek();
    // Only if MocState BtcPriceProvider has a valid price
    if (isValid && btcPrice != bytes32(0)) {
      uint256 lastClosingPriceDoCMoc = dex.getLastClosingPrice(baseTokenDocMoc, secondaryTokenDocMoc);
      //uint256 mocPriceBtc = lastClosingPriceDoCMoc.div(uint256(btcPrice));
      uint256 mocPriceBtc = lastClosingPriceDoCMoc.mul(RATE_PRECISION).div(uint256(btcPrice));
      return (bytes32(mocPriceBtc), mocPriceBtc != 0);
    }
    return (0, false);
  }
}
