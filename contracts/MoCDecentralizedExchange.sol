pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "./RestrictiveOrderListing.sol";
import "partial-execution/contracts/PartialExecution.sol";


contract EventfulExchange {
  /**
@dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
*/
  event NewOrderAddedToPendingQueue(
    uint256 indexed id,
    // On the RSK network, having an event with only one parameter
    // which is indexed breaks the web3 importer, so a dummy
    // argument is added.
    uint256 notIndexedArgumentSoTheThingDoesntBreak
  );

  /**
@notice notifies the buyer that their order matched
@dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
@param orderId the buyer's order
@param amountSent the amount of baseToken [using baseTokenDecimals] sent to the seller
@param commission the amount of baseToken [using baseTokenDecimals] that was charged as commission
@param change the amount of baseToken [using baseTokenDecimals] sent back to the buyer
@param received the amount of secondaryToken [using secondaryTokenDecimals] received in exchange
@param remainingAmount = totalOrderAmount - (amountSent + change), if remainingAmount is 0, the order is filled and removed from the orderbook.
@param matchPrice the price [using priceComparisonPrecision] at which the order matched
@param tickNumber the tick's number in witch the order matched
*/
  event BuyerMatch(
    uint256 indexed orderId,
    uint256 amountSent,
    uint256 commission,
    uint256 change,
    uint256 received,
    uint256 remainingAmount,
    uint256 matchPrice,
    uint64 tickNumber
  );

  /**
@notice notifies the seller that their order matched
@dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
@param orderId the seller's order
@param amountSent the amount of secondaryToken [using secondaryTokenDecimals] sent to the buyer
@param commission the amount of secondaryToken [using baseTokenDecimals] that was charged as commission
@param received the total amount the seller recieved == expected + surplus.
@param surplus the amount of baseToken [using baseTokenDecimals] the seller recieved additional to the expected.
@param remainingAmount = totalOrderAmount - amountSent, if remainingAmount is 0, the order is filled and removed from the orderbook.
@param matchPrice the price [using priceComparisonPrecision] at which the order matched
@param tickNumber the tick's number in witch the order matched
*/
  event SellerMatch(
    uint256 indexed orderId,
    uint256 amountSent,
    uint256 commission,
    uint256 received,
    uint256 surplus,
    uint256 remainingAmount,
    uint256 matchPrice,
    uint64 tickNumber
  );

  /**
@dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
@notice emitted when and expired Order has been process and it funds returned
@param orderId id of the expired order processed
@param owner the secondary token of the pair
@param returnedAmount actual token amount returned to the owner
@param commission applied as penalizacion for the expiration
@param returnedCommission the commission returned as the expiration does not consume the whole commission
*/
  event ExpiredOrderProcessed(
    uint256 indexed orderId,
    address indexed owner,
    uint256 returnedAmount,
    uint256 commission,
    uint256 returnedCommission
  );

  /**
@dev Cloned from MoCExchangeLib.sol or the event it is not recognized and emitted from that lib
@notice notifies the start of the tick
@param baseTokenAddress the base token of the pair
@param secondaryTokenAddress the secondary token of the pair
@param number the tick number that just started
*/
  event TickStart(address indexed baseTokenAddress, address indexed secondaryTokenAddress, uint64 number);

  /**
@dev Cloned from TickState.sol or the event it is not recogniced and emited from that lib
@notice notifies the end of the tick and its result
@param baseTokenAddress the base token of the pair
@param secondaryTokenAddress the secondary token of the pair
@param number the tick number that just finished
@param nextTickBlock the block number after wich one it can be excecuted the next tick
@param closingPrice the price [using priceComparisonPrecision] used to match the orders this tick
*/
  event TickEnd(
    address indexed baseTokenAddress,
    address indexed secondaryTokenAddress,
    uint64 indexed number,
    uint256 nextTickBlock,
    uint256 closingPrice
  );
}


contract MoCDecentralizedExchange is EventfulExchange, RestrictiveOrderListing, PartialExecution {
  using SafeMath for uint256;
  using MoCExchangeLib for MoCExchangeLib.Pair;

  /**
@notice Checks that the tick of the pair is not running, fails otherwise
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  modifier whenTickIsNotRunning(address _baseToken, address _secondaryToken) {
    require(!tickIsRunning(_baseToken, _secondaryToken), "Tick is running");
    _;
  }

  enum TaskTypes {SIMULATION, MATCHING, MOVING_OUT_PENDINGS, length}

  /**
@notice Start or continue the execution of a tick for the given pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param steps Maximum steps to be done
*/
  function matchOrders(
    address _baseToken,
    address _secondaryToken,
    uint256 steps
  ) external whenNotPaused {
    executeGroup(getGroupIdForPair(_baseToken, _secondaryToken), steps);
  }

  /**
@notice Start or continue the execution of a tick for the given pair with hints
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param steps Maximum steps to be done
@param hintIds Array that help internal functions, at the moment only using in
the moving of pending orders, pointing succesively to the orders that should be
the previous to the one moved
*/
  function matchOrdersWithHints(
    address _baseToken,
    address _secondaryToken,
    uint256 steps,
    uint256[] calldata hintIds
  ) external whenNotPaused {
    MoCExchangeLib.TickPaginationMemory storage pageMemory = getTokenPair(_baseToken, _secondaryToken).pageMemory;
    pageMemory.hintIds = hintIds;

    executeGroup(getGroupIdForPair(_baseToken, _secondaryToken), steps);
    delete pageMemory.hintIds;
    delete pageMemory.hintIdsIndex;
  }

  /**
    @notice Process expired Orders for the given orderbook, returning funds to the owner while applying commission
    @dev iterates _steps times over the orderbook starting from _orderId and process any encountered expired order
    @param _baseToken Base token to identify the orderbook
    @param _secondaryToken Secondary token to identify the orderbook
    @param _evaluateBuyOrders true if buy orders have to be processed, false if sell orders have to
    @param _orderId Order id to start expiring process. If zero, will start from ordebook top.
    @param _previousOrderIdHint previous order id hint in the orderbook to _orderId, used as on optimization to search for.
    If zero, will start from ordebook top.
    @param _steps Number of iterations to look for expired orders to process. Use one, if just looking to process _orderId only
    */
  function processExpired(
    address _baseToken,
    address _secondaryToken,
    bool _evaluateBuyOrders,
    uint256 _orderId,
    uint256 _previousOrderIdHint,
    uint256 _steps
  ) external whenNotPaused {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    MoCExchangeLib.processExpired(pair, commissionManager, _evaluateBuyOrders, _orderId, _previousOrderIdHint, _steps);
  }

  /**
    @notice Process expired Orders for the given orderbook, returning funds to the owner while applying commission
    @dev iterates _steps times over the orderbook starting from _orderId and process any encountered expired order
    @param _baseToken Base token to identify the orderbook
    @param _secondaryToken Secondary token to identify the orderbook
    @param _evaluateBuyOrders true if buy orders have to be evaluated, false if sell orders have to
  */
  function areOrdersToExpire(
    address _baseToken,
    address _secondaryToken,
    bool _evaluateBuyOrders
  ) external view returns (bool) {
    MoCExchangeLib.Pair storage pair = getTokenPair(_baseToken, _secondaryToken);
    return MoCExchangeLib.areOrdersToExpire(pair, _evaluateBuyOrders);
  }

  /**
@notice Getter for every value related to a pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return tickNumber - the current tick number
@return nextTickBlock - the block number after wich one it can be excecuted the next tick
@return lastTickBlock - the block number in which one the last tick was executed
@return lastClosingPrice - the last price from a successful matching
@return emergentPrice: AVG price of the last matched Orders
@return lastBuyMatchId Id of the last Buy order to match
@return lastSellMatchId Id of the last Sell order to match
@return disabled False if orders can be inserted, true otherwise
*/
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
      uint256 smoothingFactor
    )
  {
    (tickNumber, nextTickBlock, lastTickBlock, lastClosingPrice, disabled, emaPrice, smoothingFactor) = getStatus(_baseToken, _secondaryToken);
    (emergentPrice, lastBuyMatchId, lastBuyMatchAmount, lastSellMatchId) = getEmergentPrice(_baseToken, _secondaryToken);
  }

  /**
@notice Cancel a buy order;
tick must not be running; the contract must not be paused; the caller should be the order owner
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _orderId Id of the order to be cancelled
@param _previousOrderIdHint Order that comes immediately before the newly cancelled order;
0 is considered as a hint to look from the beggining
*/
  function cancelBuyOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _orderId,
    uint256 _previousOrderIdHint
  ) public whenTickIsNotRunning(_baseToken, _secondaryToken) {
    OrderListing.cancelBuyOrder(_baseToken, _secondaryToken, _orderId, _previousOrderIdHint);
  }

  /**
@notice Cancel a sell order;
tick must not be running; the contract must not be paused; the caller should be the order owner
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _orderId Id of the order to be cancelled
@param _previousOrderIdHint Order that comes immediately before the newly cancelled order;
0 is considered as a hint to look from the beggining
*/
  function cancelSellOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _orderId,
    uint256 _previousOrderIdHint
  ) public whenTickIsNotRunning(_baseToken, _secondaryToken) {
    OrderListing.cancelSellOrder(_baseToken, _secondaryToken, _orderId, _previousOrderIdHint);
  }

  /**
@notice Disable the insertion of orders in a pair; the pair must have been added before
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function disableTokenPair(address _baseToken, address _secondaryToken) public whenTickIsNotRunning(_baseToken, _secondaryToken) {
    TokenPairListing.disableTokenPair(_baseToken, _secondaryToken);
  }

  /**
@notice Re-enable the insertion of orders in a pair; the pair must have been added
and disabled first
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function enableTokenPair(address _baseToken, address _secondaryToken) public whenTickIsNotRunning(_baseToken, _secondaryToken) {
    TokenPairListing.enableTokenPair(_baseToken, _secondaryToken);
  }

  /**
@notice Returns true if the pair is running a tick
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
*/
  function tickIsRunning(address _baseToken, address _secondaryToken) public view returns (bool) {
    return getTickStage(_baseToken, _secondaryToken) != MoCExchangeLib.TickStage.RECEIVING_ORDERS;
  }

  /**
@notice Calculates closing price as if the tick closes at this moment
@return emergentPrice: AVG price of the last matched Orders
@return lastBuyMatchId Id of the last Buy order to match
@return lastBuyMatchAmount Amount of the last Buy order to match
@return lastSellMatchId Id of the last Sell order to match
*/
  function getEmergentPrice(address _baseToken, address _secondaryToken)
    public
    view
    returns (
      uint256 emergentPrice,
      uint256 lastBuyMatchId,
      uint256 lastBuyMatchAmount,
      uint256 lastSellMatchId
    )
  {
    MoCExchangeLib.Pair storage pair = tokenPair(_baseToken, _secondaryToken);
    if (!pair.isValid()) return (0, 0, 0, 0);

    return pair.getEmergentPrice();
  }

  /**
@notice Returns the tick stage for a given pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return Enum representing the tick stage
*/
  function getTickStage(address _baseToken, address _secondaryToken) public view returns (MoCExchangeLib.TickStage stage) {
    return getTokenPair(_baseToken, _secondaryToken).tickStage;
  }

  /**
@notice Adds a token pair to be listed; the base token must be the commonBaseToken or be listed against it
@dev
We add the group tasks here so
it's necessary to have the addTokenPair functionality here since
here is where we add the PartialExecution Tasks and TaskGroup for the
paginated tick execution. Since tasks receive their TaskId and
GroupId, we use the same id for the group and the token pair,
and the functions passed to the pagination library retrieve their
associated pair with the groupId.

@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@param _priceComparisonPrecision Precision to be used in the pair price
@param _initialPrice Price used initially until a new tick with matching orders is run
*/
  function addTokenPair(
    address _baseToken,
    address _secondaryToken,
    uint256 _priceComparisonPrecision,
    uint256 _initialPrice
  ) public {
    // The TokenPairListing, called by TokenPairConverter, validates the caller is an
    // authorized changer
    TokenPairConverter.addTokenPair(_baseToken, _secondaryToken, _priceComparisonPrecision, _initialPrice);
    bytes32 groupId = getGroupIdForPair(_baseToken, _secondaryToken);
    bytes32[] memory taskList = new bytes32[](uint256(TaskTypes.length));
    taskList[uint256(TaskTypes.SIMULATION)] = getTaskId(groupId, TaskTypes.SIMULATION);
    taskList[uint256(TaskTypes.MATCHING)] = getTaskId(groupId, TaskTypes.MATCHING);
    taskList[uint256(TaskTypes.MOVING_OUT_PENDINGS)] = getTaskId(groupId, TaskTypes.MOVING_OUT_PENDINGS);
    createTask(taskList[uint256(TaskTypes.SIMULATION)], simulationStepFunction, onSimulationStart, onSimulationFinish);
    createTask(taskList[uint256(TaskTypes.MATCHING)], matchOrdersStepFunction, onMatchOrdersStart, nullHookForTask);
    createTask(taskList[uint256(TaskTypes.MOVING_OUT_PENDINGS)], movePendingOrdersStepFunction, onMovePendingsStart, nullHookForTask);

    createTaskGroup(groupId, taskList, onTickStart, onTickFinish, true);
  }

  /**
@notice Hook called when the simulation of the matching of orders starts; marks as so the tick stage
Initializes the pageMemory with the first valid orders
Has one discarded param; kept to have a fixed signature
@dev The initialization of lastBuyMatch/lastSellMatch without checking if they should match can cause
some inconsistency but it is covered by the matchesAmount attribute in the pageMemory
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function onSimulationStart(bytes32 _groupId, bytes32) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    assert(pair.tickStage == MoCExchangeLib.TickStage.RECEIVING_ORDERS);
    MoCExchangeLib.onSimulationStart(pair);
  }

  /**
@notice Hook called when the simulation of the matching of orders finish; marks as so the tick stage
Has one discarded param; kept to have a fixed signature
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function simulationStepFunction(
    bytes32 _groupId,
    bytes32,
    uint256
  ) private returns (bool) {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    assert(pair.tickStage == MoCExchangeLib.TickStage.RUNNING_SIMULATION);

    bool keepGoing = pair.simulateMatchingStep();

    return keepGoing;
  }

  /**
@notice Hook called when the simulation of the matching of orders finish; marks as so the tick stage
Has one discarded param; kept to have a fixed signature
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function onSimulationFinish(bytes32 _groupId, bytes32) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    MoCExchangeLib.onSimulationFinish(pair);
  }

  /**
@notice Hook called when the actual matching of orders starts; marks as so the tick stage
Has one discarded param; kept to have a fixed signature
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function onMatchOrdersStart(bytes32 _groupId, bytes32) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    assert(pair.tickStage == MoCExchangeLib.TickStage.RUNNING_SIMULATION);
    pair.tickStage = MoCExchangeLib.TickStage.RUNNING_MATCHING;
  }

  /**
@notice Matches a single pair of orders; partially or completely
Has two discarded param; kept to have a fixed signature
@dev This function can be blocked with a block gas limit DoS if there are enough continous
expired orders; to overcome this you should call processExpired and the continue with the tick
@return True if there are still orders to match
*/
  function matchOrdersStepFunction(
    bytes32 _groupId,
    bytes32,
    uint256
  ) private returns (bool) {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    return MoCExchangeLib.matchOrders(pair, commissionManager);
  }

  /**
@notice Hook called when the moving of pending orders starts; marks as so the tick stage
Has one discarded param; kept to have a fixed signature
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function onMovePendingsStart(bytes32 _groupId, bytes32) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    assert(pair.tickStage == MoCExchangeLib.TickStage.RUNNING_MATCHING);
    pair.tickStage = MoCExchangeLib.TickStage.MOVING_PENDING_ORDERS;
  }

  /**
@notice Moves an order from the pending queue to the orderbook
Has two discarded param; kept to have a fixed signature
@dev First it tries to move everything in the buy queue and then goes to the selling queue
Nevertheless always checks the buy order, no mather if we finished it already in case there is
a new buy order while we process the sell order.
It is important that this is the absolute LAST task of the ticks group
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
@return True if there are still pending orders to move; false otherwise
*/
  function movePendingOrdersStepFunction(
    bytes32 _groupId,
    bytes32,
    uint256
  ) private returns (bool shouldKeepGoing) {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    MoCExchangeLib.movePendingOrdersStepFunction(pair);
    return pendingSellOrdersLength(pair) != 0 || pendingBuyOrdersLength(pair) != 0;
  }

  /**
@notice Hook that gets triggered when the tick of a given pair starts.
@dev Emits an event that marks the start of a tick
@param _groupId Id that represent the group of tasks which should be done
for the execution of a tick of a given pair
*/
  function onTickStart(bytes32 _groupId) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    assert(pair.tickStage == MoCExchangeLib.TickStage.RECEIVING_ORDERS);
    pair.tickState.startTick(address(pair.baseToken.token), address(pair.secondaryToken.token));
  }

  /**
  @notice Hook that gets triggered when the tick of a given pair finishes.
  @dev Marks the state of the tick as finished(it is receiving orders again),
  sets the nextTick configs and cleans the pageMemory
  @param _groupId Id that represent the group of tasks which should be done
  for the execution of a tick of a given pair
  */
  function onTickFinish(bytes32 _groupId) private {
    MoCExchangeLib.Pair storage pair = getTokenPair(_groupId);
    MoCExchangeLib.onTickFinish(pair, tickConfig);
  }

  /**
@notice Returns the id used in the partial execution library to identify a task
@param _groupId Id of the task's group
@param _taskType Type of task
@return Task id
*/
  function getTaskId(bytes32 _groupId, TaskTypes _taskType) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(_groupId, _taskType));
  }

  /**
@notice Returns the id using in the mappings to identify the group of tasks for the execution
of a tick of a given pair
@param _baseToken Address of the base token of the pair
@param _secondaryToken Address of the secondary token of the pair
@return Group id
*/
  function getGroupIdForPair(address _baseToken, address _secondaryToken) private pure returns (bytes32) {
    return hashAddresses(_baseToken, _secondaryToken);
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
