pragma solidity 0.5.8;

import "../MoCDecentralizedExchange.sol";

// This contract is a fake for testing porpouse, it is not mend to be deployed for use.
contract MoCDexFake is MoCDecentralizedExchange {

  function editOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _orderId,
    bool isBuy,
    uint64 _newExpiresInTick
  ) external {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);

    MoCExchangeLib.Order storage order = isBuy
      ? pair.baseToken.orderbook.get(_orderId)
      : pair.secondaryToken.orderbook.get(_orderId);

    order.expiresInTick = _newExpiresInTick;
  }

  function getSellOrderAtIndex(
    address _baseToken,
    address _secondaryToken,
    uint256 _index
  ) external view returns (
    uint256 id,
    address owner,
    uint256 exchangeableAmount,
    uint256 reservedCommission,
    uint256 price,
    uint256 next
  ) {
    return iterateOrders(tokenPair(_baseToken, _secondaryToken).secondaryToken.orderbook, _index);
  }

  function getBuyOrderAtIndex(
    address _baseToken,
    address _secondaryToken,
    uint256 _index
  ) external view returns (
    uint256 id,
    address owner,
    uint256 exchangeableAmount,
    uint256 reservedCommission,
    uint256 price,
    uint256 next
  ) {
    return iterateOrders(tokenPair(_baseToken, _secondaryToken).baseToken.orderbook, _index);
  }

  function getPageMemory(
    address _baseToken,
    address _secondaryToken
  ) external view returns(
    uint256 emergentPrice,
    uint256 matchesAmount,
    uint256 lastBuyMatchId,
    uint256 lastSellMatchId,
    uint256 lastBuyMatchAmount,
    uint256 lastSellMatchAmount
  ){
    MoCExchangeLib.Pair storage pair = tokenPair(_baseToken, _secondaryToken);
    require(pair.isValid(), "invalid pair");
    MoCExchangeLib.TickPaginationMemory storage pageMemory = pair.pageMemory;
    return(
      pageMemory.emergentPrice,
      pageMemory.matchesAmount,
      pageMemory.lastBuyMatch.id,
      pageMemory.lastSellMatch.id,
      pageMemory.lastBuyMatch.exchangeableAmount,
      pageMemory.lastSellMatch.exchangeableAmount
    );
  }

  function iterateOrders(
    MoCExchangeLib.Data storage orderbook,
    uint256 _index
  ) internal view returns(uint256, address, uint256, uint256, uint256, uint256)
  {
    MoCExchangeLib.Order memory current = orderbook.first();
    for (uint256 i = 0; i < _index && current.id != 0; i++) {
      current = orderbook.get(current.next);
    }
    require(current.id != 0, "invalid index");
    return (current.id, current.owner, current.exchangeableAmount, current.reservedCommission, current.price, current.next);
  }
}
