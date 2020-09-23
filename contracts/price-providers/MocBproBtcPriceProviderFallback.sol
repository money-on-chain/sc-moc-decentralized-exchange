pragma solidity 0.5.8;

import "./PriceProviderFallback.sol";
import "../interface/IMocState.sol";

/**
  @notice gets the BproBtc Price from MocState contract
  @dev as bproTecPrice function revers in case no price available in
       BtcPriceProvider, we first peek() for it directly.
*/
contract MocBproBtcPriceProviderFallback is PriceProviderFallback {
  IMocState public mocState;

  constructor(
    IMocState _mocState,
    MoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocState = _mocState;
  }

  function failablePeek() internal view returns (bytes32, bool) {
    // MocState BtcPriceProvider is complient with IPriceProvider interface
    IPriceProvider priceProvider = IPriceProvider(mocState.getBtcPriceProvider());
    (bytes32 btcPrice, bool isValid) = priceProvider.peek();
    // Only if MocState BtcPriceProvider has a valid price, we query for the bproTecPrice
    if (isValid && btcPrice != bytes32(0)) {
      uint256 bproTecPrice = mocState.bproTecPrice();
      return (bytes32(bproTecPrice), bproTecPrice != 0);
    }
    return (btcPrice, false);
  }
}
