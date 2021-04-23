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
