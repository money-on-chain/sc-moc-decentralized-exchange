pragma solidity 0.5.8;

import "../MoCDecentralizedExchange.sol";


// This contract is a fake for testing porpouse, it is not mend to be deployed for use.
contract MoCDexFake is MoCDecentralizedExchange {
  function editOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _orderId,
    bool _isBuy,
    uint64 _newExpiresInTick
  ) external {
    MoCExchangeLib.Data storage orderbook = getOrderbook(_baseToken, _secondaryToken, _isBuy);

    orderbook.get(_orderId).expiresInTick = _newExpiresInTick;
  }

  function getOrderAtIndex(
    address _baseToken,
    address _secondaryToken,
    uint256 _index,
    bool _isBuy
  )
    external
    view
    returns (
      uint256 id,
      address owner,
      uint256 exchangeableAmount,
      uint256 multiplyFactor,
      uint256 reservedCommission,
      uint256 price,
      uint256 next
    )
  {
    return iterateOrders(getOrderbook(_baseToken, _secondaryToken, _isBuy), _index);
  }

  function getPageMemory(address _baseToken, address _secondaryToken)
    external
    view
    returns (
      uint256 emergentPrice,
      uint256 matchesAmount,
      uint256 lastBuyMatchId,
      uint256 lastSellMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchAmount
    )
  {
    MoCExchangeLib.Pair storage pair = tokenPair(_baseToken, _secondaryToken);
    require(pair.isValid(), "invalid pair");
    MoCExchangeLib.TickPaginationMemory storage pageMemory = pair.pageMemory;
    return (
      pageMemory.emergentPrice,
      pageMemory.matchesAmount,
      pageMemory.lastBuyMatch.id,
      pageMemory.lastSellMatch.id,
      pageMemory.lastBuyMatch.exchangeableAmount,
      pageMemory.lastSellMatch.exchangeableAmount
    );
  }

  function iterateOrdersFromFirstOrder(
    MoCExchangeLib.Data storage orderbook,
    MoCExchangeLib.Order memory firstOrder,
    uint256 _index
  ) internal view returns (MoCExchangeLib.Order memory) {
    MoCExchangeLib.Order memory current = firstOrder;
    for (uint256 i = 0; i < _index && current.id != 0; i++) {
      current = orderbook.get(current.next);
    }
    return current;
  }

  function iterateOrders(MoCExchangeLib.Data storage orderbook, uint256 _index)
    internal
    view
    returns (
      uint256,
      address,
      uint256,
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    MoCExchangeLib.Order memory current = orderbook.first();
    current = iterateOrdersFromFirstOrder(orderbook, current, _index);
    if (current.id == 0) {
      current = orderbook.firstMarketOrder();
      current = iterateOrdersFromFirstOrder(orderbook, current, _index);
    }
    // assert(current.id != 0);
    return (
      current.id,
      current.owner,
      current.exchangeableAmount,
      current.multiplyFactor,
      current.reservedCommission,
      current.price,
      current.next
    );
  }

  function getOrderbook(
    address _baseToken,
    address _secondaryToken,
    bool isBuy
  ) internal view returns (MoCExchangeLib.Data storage orderbook) {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);

    return isBuy ? pair.baseToken.orderbook : pair.secondaryToken.orderbook;
  }
}
