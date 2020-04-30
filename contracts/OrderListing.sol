pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/utils/ReentrancyGuard.sol";
import "areopagus/contracts/Stopper/Stoppable.sol";
import "./OrderIdGenerator.sol";
import "./CommissionManager.sol";
import "./TokenPairConverter.sol";


contract EventfulOrderListing {
  /**
    @dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
  */
  event NewOrderInserted(
    uint256 indexed id,
    address indexed sender,
    address baseTokenAddress,
    address secondaryTokenAddress,
    uint256 exchangeableAmount,
    uint256 reservedCommission,
    uint256 price,
    uint64 expiresInTick,
    bool isBuy,
    bool isMarketOrder
  );

  /**
    @notice Order cancelled event
    @param id order's id
    @param sender cancel executor address
    @param returnedAmount the amount transfered back to the order' owner
    @param commission the commission applied as penalization for the cancel
    @param returnedCommission the commission returned as the cancelation does not consume the whole commission
    @param isBuy true, if it's a buy Order. Meaning the returned amount is a Base Token transfer.
 */
  event OrderCancelled(
    uint256 indexed id,
    address indexed sender,
    uint256 returnedAmount,
    uint256 commission,
    uint256 returnedCommission,
    bool isBuy
  );

  /**
    @dev Cloned from SafeTransfer.sol or the event it is not recogniced and emited from that lib
  */
  event TransferFailed(address indexed _tokenAddress, address indexed _to, uint256 _amount, bool _isRevert);
}


contract OrderListing is EventfulOrderListing, TokenPairConverter, OrderIdGenerator, Stoppable, ReentrancyGuard {
  // intentionally using the biggest possible uint256
  // so it doesn't conflict with valid ids
  uint256 constant public INSERT_FIRST = ~uint256(0);

  CommissionManager public commissionManager;

  /**
    @notice Returns the amount of sell orders(not including the pending ones) that are in the orderbook of this pair
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
   */
  function sellOrdersLength(address _baseToken, address _secondaryToken) external view returns (uint256) {
    return tokenPair(_baseToken, _secondaryToken).secondaryToken.orderbook.length;
  }

  /**
    @notice Returns the amount of buy orders(not including the pending ones) that are in the orderbook of this pair
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
   */
  function buyOrdersLength(address _baseToken, address _secondaryToken) external view returns (uint256) {
    return tokenPair(_baseToken, _secondaryToken).baseToken.orderbook.length;
  }

  /**
    @notice Returns the amount of pending sell orders that are in the orderbook of this pair
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
   */
  function pendingSellOrdersLength(address _baseToken, address _secondaryToken) external view returns (uint256) {
    return pendingSellOrdersLength(tokenPair(_baseToken, _secondaryToken));
  }

  /**
    @notice Returns the amount of pending buy orders that are in the orderbook of this pair
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
   */
  function pendingBuyOrdersLength(address _baseToken, address _secondaryToken) external view returns (uint256) {
    return pendingBuyOrdersLength(tokenPair(_baseToken, _secondaryToken));
  }

  /**
    @notice Inserts an order in the buy orderbook of a given pair without a hint
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[base]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
   */
  function insertBuyOrder(address _baseToken, address _secondaryToken, uint256 _amount, uint256 _price, uint64 _lifespan) public {
    insertBuyOrderAfter(_baseToken, _secondaryToken, _amount, _price, _lifespan, INSERT_FIRST);
  }

  /**
    @notice Inserts an order in the sell orderbook of a given pair without a hint
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[secondary]; should have enough allowance; must be greater or equal
    than a minimum in commonBaseToken currency
    @param _price Minimum price to charge [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
   */
  function insertSellOrder(address _baseToken, address _secondaryToken, uint256 _amount, uint256 _price, uint64 _lifespan) public {
    insertSellOrderAfter(_baseToken, _secondaryToken, _amount, _price, _lifespan, INSERT_FIRST);
  }

  /**
    @notice Inserts an order in the buy orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[base]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertBuyOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public whenNotPaused {
    insertBuyOrderAfter(getTokenPair(_baseToken, _secondaryToken), _amount, _price, _lifespan, _previousOrderIdHint);
  }

  /**
    @notice Inserts an order in the sell orderbook of a given pair with a hint
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _amount Amount to be locked[secondary]; should have enough allowance; must be greater or equal
    than a minimum in commonBaseToken currency
    @param _price Minimum price to charge [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertSellOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public whenNotPaused {
    insertSellOrderAfter(getTokenPair(_baseToken, _secondaryToken), _amount, _price, _lifespan, _previousOrderIdHint);
  }

  /**
    @notice cancels the buy _orderId order.
    The contract must not be paused; the caller should be the order owner
    @param _baseToken Base Token involved in the canceled Order pair
    @param _secondaryToken Secondary Token involved in the canceled Order pair
    @param _orderId Order id to cancel
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
  */
  function cancelBuyOrder(address _baseToken, address _secondaryToken, uint256 _orderId, uint256 _previousOrderIdHint) public whenNotPaused {
    doCancelOrder(getTokenPair(_baseToken, _secondaryToken), _orderId, _previousOrderIdHint, msg.sender, true);
  }

  /**
    @notice cancels the sell _orderId order.
    the contract must not be paused; the caller should be the order owner
    @param _baseToken Base Token involved in the canceled Order pair
    @param _secondaryToken Secondary Token involved in the canceled Order pair
    @param _orderId Order id to cancel
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
  */
  function cancelSellOrder(address _baseToken, address _secondaryToken, uint256 _orderId, uint256 _previousOrderIdHint) public whenNotPaused {
    doCancelOrder(getTokenPair(_baseToken, _secondaryToken), _orderId, _previousOrderIdHint, msg.sender, false);
  }

  /**
    @notice Withdraws all the already charged(because of a matching, a cancellation or an expiration)
    commissions of a given token
    @param token Address of the token to withdraw the commissions from
   */
  function withdrawCommissions(address token) public nonReentrant {
    MoCExchangeLib.withdrawCommissions(token, commissionManager);
  }

  /**
    @notice returns the corresponding user amount. Emits the CancelOrder event
    @param _pair Token Pair involved in the canceled Order
    @param _orderId Order id to cancel
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
    @param _sender address of the account executing the cancel, revert if not order's owner
    @param _isBuy true if it's a buy order, meaning the funds should be from base Token
  */
  function doCancelOrder(MoCExchangeLib.Pair storage _pair, uint256 _orderId, uint256 _previousOrderIdHint, address _sender, bool _isBuy)
    internal
  {
    MoCExchangeLib.Token storage token = _isBuy ? _pair.baseToken : _pair.secondaryToken;
    MoCExchangeLib.Order storage toRemove = token.orderbook.get(_orderId);
    require(toRemove.id != 0, "Order not found");

    // Copy order needed values before deleting it
    (uint256 exchangeableAmount, uint256 reservedCommission, address owner) = (
      toRemove.exchangeableAmount,
      toRemove.reservedCommission,
      toRemove.owner
    );
    token.orderbook.removeOrder(toRemove, _previousOrderIdHint);
    require(owner == _sender, "Not order owner");

    (bool transferResult, uint256 returnedAmount, uint256 commission, uint256 returnedCommission) = MoCExchangeLib.refundOrder(
      commissionManager,
      token.token,
      exchangeableAmount,
      reservedCommission,
      _sender,
      false
    );
    require(transferResult, "Token transfer failed");
    emit OrderCancelled(_orderId, _sender, returnedAmount, commission, returnedCommission, _isBuy);
  }

  /**
    @dev This function must initialize every variable in storage, this is necessary because of the proxy
    pattern we are using. The initializer modifier disables this function once its called so it prevents
    that someone else calls it without the deployer noticing. Of course they may block your deploys but that
    would be an extremely unlucky scenario. onlyAuthorizedChanger cannot be used here since the governor is not set yet
    @param _commonBaseTokenAddress address of the common base token, necessary to convert amounts to a known scale
    @param _commissionManager Address of the contract that manages all the fee related things
    @param _expectedOrdersForTick amount of orders expected to match in each tick
    @param _maxBlocksForTick the max amount of blocks to wait until allowing to run the tick
    @param _minBlocksForTick the min amount of blocks to wait until allowing to run the tick
    @param _governor Address in charge of determining who is authorized and who is not
    @param _stopper Address that is authorized to pause the contract
 */
  function initialize(
    address _commonBaseTokenAddress,
    CommissionManager _commissionManager,
    uint64 _expectedOrdersForTick,
    uint64 _maxBlocksForTick,
    uint64 _minBlocksForTick,
    address _governor,
    address _stopper
  ) internal initializer {
    TokenPairConverter.initialize(_commonBaseTokenAddress, _expectedOrdersForTick, _maxBlocksForTick, _minBlocksForTick, _governor);
    OrderIdGenerator.initialize(0);
    commissionManager = _commissionManager;
    Stoppable.initialize(_stopper, _governor);
  }

  /**
    @notice Returns the amount of pending sell orders that are in the orderbook of this pair
    @param _pair Storage structure that represents the pair
   */
  function pendingSellOrdersLength(MoCExchangeLib.Pair storage _pair) internal view returns (uint256) {
    return _pair.secondaryToken.orderbook.amountOfPendingOrders;
  }

  /**
    @notice Returns the amount of pending buy orders that are in the orderbook of this pair
    @param _pair Storage structure that represents the pair
   */
  function pendingBuyOrdersLength(MoCExchangeLib.Pair storage _pair) internal view returns (uint256) {
    return _pair.baseToken.orderbook.amountOfPendingOrders;
  }

  /**
    @notice Inserts an order in the buy orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom

    @param _pair Storage structure that represents the pair
    @param _amount Amount to be locked[base]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertBuyOrderAfter(
    MoCExchangeLib.Pair storage _pair,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) private {
    uint256 initialFee = commissionManager.calculateInitialFee(_amount);
    _pair.doInsertOrder(
      nextId(),
      _amount.sub(initialFee),
      initialFee,
      _price,
      _lifespan,
      _previousOrderIdHint,
      msg.sender,
      address(this),
      true
    );  
  }

  /**
    @notice Inserts a market order in the buy orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _exchangeableAmout The quantity of tokens to put in the orderbook
    @param _multiplyFactor Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertBuyMarketOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _exchangeableAmout,
    uint256 _multiplyFactor,
    uint64 _lifespan
  ) public {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    uint256 initialFee = commissionManager.calculateInitialFee(_exchangeableAmout.mul(_multiplyFactor));
    pair.doInsertMarketOrder(
      nextId(),
      _exchangeableAmout,
      initialFee,
      _multiplyFactor,
      _lifespan,
      INSERT_FIRST,
      msg.sender,
      true
    );  
  }

  /**
    @notice Inserts an order in the sell orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _pair Storage structure that represents the pair
    @param _amount Amount to be locked[secondary]; should have enough allowance
    @param _price Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    @param _previousOrderIdHint Order that comes immediately before the new order;
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
   */
  function insertSellOrderAfter(
    MoCExchangeLib.Pair storage _pair,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) private {
    uint256 initialFee = commissionManager.calculateInitialFee(_amount);
    _pair.doInsertOrder(
      nextId(),
      _amount.sub(initialFee),
      initialFee,
      _price,
      _lifespan,
      _previousOrderIdHint,
      msg.sender,
      address(this),
      false
    );
  }

  /**
    @notice Inserts a market order in the buy orderbook of a given pair with a hint;
    the pair should not be disabled; the contract should not be paused. Takes the funds
    with a transferFrom
    @param _baseToken the base token of the pair
    @param _secondaryToken the secondary token of the pair
    @param _exchangeableAmout The quantity of tokens to put in the orderbook
    @param _multiplyFactor Maximum price to be paid [base/secondary]
    @param _lifespan After _lifespan ticks the order will be expired and no longer matched, must be lower or equal than the maximum
    0 is considered as no hint and the smart contract must iterate
    INSERT_FIRST is considered a hint to be put at the start
  */
  function insertSellMarketOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _exchangeableAmout,
    uint256 _multiplyFactor,
    uint64 _lifespan
  ) public {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    uint256 initialFee = commissionManager.calculateInitialFee(_exchangeableAmout.mul(_multiplyFactor));
    pair.doInsertMarketOrder(
      nextId(),
      _exchangeableAmout,
      initialFee,
      _multiplyFactor,
      _lifespan,
      INSERT_FIRST,
      msg.sender,
      false
    );  
  }


  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
