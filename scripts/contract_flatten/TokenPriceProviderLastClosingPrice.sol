// SPDX-License-Identifier: 
// File: contracts/interface/IPriceProvider.sol

pragma solidity 0.5.8;

/**
 * @notice Get price of a Token. See https://github.com/money-on-chain/OMoC-Decentralized-Oracle
 * @dev Interface of OMoC-Decentralized-Oracle, compatible with MOC.
 */
interface IPriceProvider {
  function peek() external view returns (bytes32, bool);
}

// File: contracts/interface/IMoCDecentralizedExchange.sol

pragma solidity 0.5.8;


contract IMoCDecentralizedExchange {

  function getTokenPairStatus(address _baseToken, address _secondaryToken)
    external
    view
    returns (
      uint256 emergentPrice,
      uint256 lastBuyMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchId,
      uint64 tickNumber,
      uint256 nextTickBlock,
      uint256 lastTickBlock,
      uint256 lastClosingPrice,
      bool disabled,
      uint256 emaPrice,
      uint256 smoothingFactor,
      uint256 marketPrice
    );

  function getLastClosingPrice(address _baseToken, address _secondaryToken) external view returns (uint256 lastClosingPrice) ;

  function getEmergentPrice(address _baseToken, address _secondaryToken)
    public
    view
    returns (
      uint256 emergentPrice,
      uint256 lastBuyMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchId
    );

  function getMarketPrice(address _baseToken, address _secondaryToken) public view returns (uint256);

}

// File: contracts/price-providers/TokenPriceProviderLastClosingPrice.sol

pragma solidity 0.5.8;



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
