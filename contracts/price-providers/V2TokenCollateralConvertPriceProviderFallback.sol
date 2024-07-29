pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";

import "./PriceProviderFallback.sol";
import "../interface/IMoCV2.sol";
import "../interface/IPriceProvider.sol";

/**
  @notice gets the technical price from V2 Protocol and convert to
  @dev Parameters the MoC V2 address
  The TP address is need to verified if is the protocol has valid price or not
*/
contract V2TokenCollateralConvertPriceProviderFallback is PriceProviderFallback {

  using SafeMath for uint256;
  uint256 public constant RATE_PRECISION = uint256(10**18);

  IMoCV2 public mocV2;
  address public tpAddress;
  address public caPriceProviderAddress;

  constructor(
    IMoCV2 _mocV2,
    address _tpAddress,
    address _caPriceProviderAddress,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocV2 = _mocV2;
    tpAddress = _tpAddress;
    caPriceProviderAddress = _caPriceProviderAddress;
  }

  function failablePeek() internal view returns (bytes32, bool) {

    IMoCV2.PeggedTokenIndex memory tpIndex = mocV2.peggedTokenIndex(tpAddress);

    if (!tpIndex.exists) {
      // If not exist is not a valid price
      return (0, false);
    }

    IMoCV2.PegContainerItem memory tpItem = mocV2.pegContainer(tpIndex.index);

    IPriceProvider priceProvider = IPriceProvider(tpItem.priceProvider);
    (bytes32 price, bool isValid) = priceProvider.peek();

    // Only if has a valid price
    if (isValid && price != bytes32(0)) {

      IPriceProvider priceProviderCA = IPriceProvider(caPriceProviderAddress);
      (bytes32 priceCA, bool isValidCA) = priceProviderCA.peek();

      if (isValidCA && priceCA != bytes32(0)) {
        uint256 tecPrice = mocV2.getPTCac();
        if (bytes32(tecPrice) != bytes32(0)) {
          uint256 calculatedPrice = uint256(tecPrice).mul(uint256(priceCA)).div(RATE_PRECISION);
          return (bytes32(calculatedPrice), calculatedPrice != 0);
        }

      }

    }

    return (0, false);
  }
}
