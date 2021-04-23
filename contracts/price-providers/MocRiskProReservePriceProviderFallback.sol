pragma solidity 0.5.8;

import "./PriceProviderFallback.sol";
import "../interface/IRRC20State.sol";

/**
  @notice gets the RiskProReserve Price from MocState contract
  @dev as riskProTecPrice function revers in case no price available in
       getPriceProvider, we first peek() for it directly.
*/
contract MocRiskProReservePriceProviderFallback is PriceProviderFallback {
  IRRC20State public mocState;

  constructor(
    IRRC20State _mocState,
    IMoCDecentralizedExchange _dex,
    address _baseToken,
    address _secondaryToken
  ) public PriceProviderFallback(_dex, _baseToken, _secondaryToken) {
    mocState = _mocState;
  }

  function failablePeek() internal view returns (bytes32, bool) {
    // MocState BtcPriceProvider is complient with IPriceProvider interface
    IPriceProvider priceProvider = IPriceProvider(mocState.getPriceProvider());
    (bytes32 btcPrice, bool isValid) = priceProvider.peek();
    // Only if MocState getPriceProvider has a valid price, we query for the riskProTecPrice
    if (isValid && btcPrice != bytes32(0)) {
      uint256 bproTecPrice = mocState.riskProTecPrice();
      return (bytes32(bproTecPrice), bproTecPrice != 0);
    }
    return (btcPrice, false);
  }
}
