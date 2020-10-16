pragma solidity 0.5.8;

/**
 * @notice Interface for RRC20 MocState price providers relevant methods
 */
interface IRRC20State {

  /**
  * @dev RiskPro USD PRICE
  * @return the RiskPro USD Price [using mocPrecision]
  */
  function riskProUsdPrice() external view returns(uint256);

  /**
  * @dev RESERVE price of RiskPro
  * @return the RiskPro Tec Price [using reservePrecision]
  */
  function riskProTecPrice() external view returns(uint256);

  /**
  * @dev Gets the PriceProvider
  * @return getPriceProvider blocks there are in a day
  **/
  function getPriceProvider() external view returns(address);
}