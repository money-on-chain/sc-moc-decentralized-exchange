pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./PriceProviderFallback.sol";
import "../interface/IMoCV2.sol";
import "../interface/IPriceProvider.sol";

/**
  @notice gets the technical price from V2 Protocol
  @dev Parameters the MoC V2 address
  The TP address is need to verified if is the protocol has valid price or not
*/
contract V2TokenCollateralTecPriceProviderFallback is PriceProviderFallback {

  IMoCV2 public mocV2;
  address public tpAddress;

  constructor(
    IMoCV2 _mocV2,
    address _tpAddress,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocV2 = _mocV2;
    tpAddress = _tpAddress;
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
        uint256 tecPrice = mocV2.getPTCac();
        bytes32 tecPriceBytes = bytes32(tecPrice);
        if (tecPriceBytes != bytes32(0)) {
            return (tecPriceBytes, true);
        }
    }

    return (0, false);
  }
}
