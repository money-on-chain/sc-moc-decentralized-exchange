pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "../CommissionManager.sol";

import {SafeTransfer} from "./SafeTransfer.sol";
import {TickState} from "./TickState.sol";

/**
  @notice A library that manages the orderbook and pending queue of the pairs listed in the MoCDecentralizedExchange
 */
library MoCExchangeLib {
    using TickState for TickState.Data;
    using SafeMath for uint256;

    /**
    @notice Posible types of a match depending on which order is filled
    @dev At least one order has to be filled in any match in our exchange
   */
    enum MatchType {BUYER_FILL, SELLER_FILL, DOUBLE_FILL}

    /**
    @notice Posible states of a tick. RECEIVING_ORDERS can be seen as the
    non-running tick state as there is no computation pending yet, the exchange is
    waiting for orders to come
   */
    enum TickStage {
        RECEIVING_ORDERS,
        RUNNING_SIMULATION,
        RUNNING_MATCHING,
        MOVING_PENDING_ORDERS
    }

    // intentionally using the biggest possible uint256
    // so it doesn't conflict with valid ids
    uint256 constant INSERT_FIRST = ~uint256(0);

    /**
    @notice A new order has been inserted in the orderbook, and it is ready to be matched
    @param id Id of the order
    @param sender Address owner of the order
    @param baseTokenAddress Address of the token used as base in the pair(it is the token being used as currency,
    to pay the good, the secondary token)
    @param secondaryTokenAddress Address of the token used as secondary in the pair(it is the good
    being exchanged in this pair)
    @param exchangeableAmount Amount that was left to be exchanged
    @param reservedCommission Commission reserved to be charged later
    @param price Target price of the order[base/secondary]
    @param expiresInTick Number of tick in which the order can no longer be matched
    @param isBuy The order is a buy order
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
        bool isBuy
    );

    /**
    @notice A new order has been inserted in the pending queue. It is waiting to be moved to the orderbook
    @dev On the RSK network, having an event with only one parameter which is indexed breaks the web3
    importer, so a dummy argument is added.
   */
    event NewOrderAddedToPendingQueue(
        uint256 indexed id,
        uint256 notIndexedArgumentSoTheThingDoesntBreak
    );

    /**
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
    @notice notifies the buyer that their order matched
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
    @notice Struct representing one of the token of a pair. If it's a base Token, orderbook will have buy Orders
   */
    struct Token {
        Data orderbook;
        IERC20 token;
    }

    /**
    @notice Struct representing a pair being exchanged in this exchange
   */
    struct Pair {
        Token baseToken;
        Token secondaryToken;
        TickState.Data tickState;
        TickPaginationMemory pageMemory;
        TickStage tickStage;
        uint256 priceComparisonPrecision;
        uint256 lastClosingPrice;
        bool disabled;
        uint256 EMAPrice;
        uint256 smoothingFactor;
    }

    /**
    @notice Struct used as an auxiliar storage to keep the cross-tick necessary data i.e. data that is volatile between two
    different ticks but has to be persisted for a given tick
   */
    struct TickPaginationMemory {
        uint256 emergentPrice;
        uint256 matchesAmount;
        uint256[] hintIds;
        uint256 hintIdsIndex;
        Order lastBuyMatch;
        Order lastSellMatch;
    }

    /**
    @notice Struct that contains all the order of the same type(buy or sell) of a given pair. It has two internal structures,
    the orderbook itself and a pendinQueue.
    @dev The decision to merge the orderbook and pendingQueue into a single struct was made to be able to have both types of
    orders in the same mapping making the movement between the two structs much cheaper
   */
    struct Data {
        mapping(uint256 => Order) orders;
        uint256 firstId;
        uint256 length;
        uint256 firstPendingToPopId;
        uint256 lastPendingToPopId;
        uint256 amountOfPendingOrders;
        bool orderDescending;
    }

    /**
    @notice Struct representing a single order
    @dev The next attribute is a reference to the next order in the structure this order is in
  */
    struct Order {
        uint256 id;
        uint256 exchangeableAmount;
        uint256 reservedCommission;
        uint256 price;
        uint256 next;
        address owner;
        uint64 expiresInTick;
    }

    /**
    @notice Inserts an order in an orderbook without a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
    function insertOrder(
        Data storage self,
        uint256 _orderId,
        address _sender,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _expiresInTick
    ) public {
        insertOrder(
            self,
            _orderId,
            _sender,
            _exchangeableAmount,
            _reservedCommission,
            _price,
            _expiresInTick,
            findPreviousOrderToPrice(self, _price)
        );
    }

    /**
    @notice Inserts an order in an orderbook with a hint
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
    @param  _intendedPreviousOrderId Hint id of the order to be before the new order in the orderbook
  */
    function insertOrder(
        Data storage self,
        uint256 _orderId,
        address _sender,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _expiresInTick,
        uint256 _intendedPreviousOrderId
    ) public {
        validatePreviousOrder(self, _price, _intendedPreviousOrderId);
        createOrder(
            self,
            _orderId,
            _sender,
            _exchangeableAmount,
            _reservedCommission,
            _price,
            _expiresInTick
        );
        positionOrder(self, _orderId, _intendedPreviousOrderId);
    }

    /**
    @notice Inserts an order in a pending queue
    @dev The type of the order is given implicitly by the data structure where it is saved
    @param self The data structure in where the order will be inserted
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
    function insertOrderAsPending(
        Data storage self,
        uint256 _orderId,
        address _sender,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _expiresInTick
    ) public {
        self.orders[_orderId] = Order(
            _orderId,
            _exchangeableAmount,
            _reservedCommission,
            _price,
            0,
            _sender,
            _expiresInTick
        );
        positionOrderAsPending(self, _orderId);
    }

    /**
    @notice Checks that the order should be in the place where it is trying to be inserted, reverts otherwise
    @param _price Target price of the new order
    @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted,
    if 0 it is asumed to be put at the start
   */
    function validatePreviousOrder(
        Data storage self,
        uint256 _price,
        uint256 _intendedPreviousOrderId
    ) public view {
        if (_intendedPreviousOrderId == 0) {
            // order is intended to be the first in the Data
            validateIntendedFirstOrderInTheData(self, _price);
        } else {
            validateOrderIntendedPreviousOrder(
                self,
                _intendedPreviousOrderId,
                _price
            );
        }

    }

    /**
    @notice Checks that the order should be in the first place of the orderbook where it is trying to be inserted
    @param _price Target price of the new order
   */
    function validateIntendedFirstOrderInTheData(
        Data storage self,
        uint256 _price
    ) private view {
        if (self.length != 0) {
            // there is one or more orders in the Data, so the price should be the most competitive
            Order storage firstOrder = first(self);
            require(
                priceGoesBefore(self, _price, firstOrder.price),
                "Price doesnt belong to start"
            );
        }
    }

    /**
    @notice Checks that the order should be in the place where it is trying to be inserted, reverts otherwise
    @param _price Target price of the new order
    @param _intendedPreviousOrderId Id of the order which is intended to be the order before the new one being inserted
   */
    function validateOrderIntendedPreviousOrder(
        Data storage self,
        uint256 _intendedPreviousOrderId,
        uint256 _price
    ) private view {
        Order storage previousOrder = get(self, _intendedPreviousOrderId);
        // the order for the _intendedPreviousOrderId provided exist
        require(previousOrder.id != 0, "PreviousOrder doesnt exist");
        // the price goes after the intended previous order
        require(
            !priceGoesBefore(self, _price, previousOrder.price),
            "Order should go before"
        );
        Order storage nextOrder = get(self, previousOrder.next);
        // the price goes before the next order, if there is a next order
        require(
            nextOrder.id == 0 || priceGoesBefore(self, _price, nextOrder.price),
            "Order should go after"
        );
    }

    /**
    @notice drops first element and returs the new top
    @dev deleted first Order, replacin it wi the following one and shrinks the orderbook size
    @return new orderbook top (first)
   */
    function popAndGetNewTop(Data storage self)
        internal
        returns (Order storage)
    {
        Order storage nextOrder = get(self, get(self, self.firstId).next);
        // TODO: benchmark this operation as this 2 writes inside a loop could be optimiced.
        // Readability over perfirmance was prioratized in this stage.
        delete (self.orders[self.firstId]);
        self.firstId = nextOrder.id;
        self.length = self.length.sub(1);
        return nextOrder;
    }

    /**
    @notice Checks if the order is the last of the orderbook where it is saved
    @param _order Order to be checked
   */
    function isLastOfOrderbook(Order storage _order)
        internal
        view
        returns (bool)
    {
        return _order.next == 0;
    }

    /**
    @notice Checks if the order is the first of the orderbook where it is saved
    @param self Orderbook where the _order is supposed to be stored(we dont actually check if it is stored there)
    @param _order Order to be checked
   */
    function isFirstOfOrderbook(Data storage self, Order storage _order)
        internal
        view
        returns (bool)
    {
        return self.firstId == _order.id;
    }

    /**
    @notice removes an order from the self collection
    @dev copy any Order value before removing it as it will be cleared
    @param self Data struct to remove the order from
    @param _toRemove Order to remove
    @param _startFromId previous hint to look for (if zero, starts from beggining)
  */
    function removeOrder(
        Data storage self,
        Order storage _toRemove,
        uint256 _startFromId
    ) public {
        if (isFirstOfOrderbook(self, _toRemove)) {
            // If first order, re-assing the linked list start to next
            self.firstId = _toRemove.next;
        } else {
            (bool found, Order storage previousOrder) = findPreviousOrder(
                self,
                _toRemove.id,
                _startFromId
            );
            require(found, "Previous order not found");

            if (isLastOfOrderbook(_toRemove)) {
                // If last Order, and not only, tails previous
                previousOrder.next = 0;
            } else {
                // if in the middle, link prevoius to next
                previousOrder.next = _toRemove.next;
            }
        }
        // In any case, the item should be deleted and the list resized
        delete (self.orders[_toRemove.id]);
        self.length = self.length.sub(1);
    }

    /**
    @notice Creates a new order to be positioned later in the orderbook or a pendingQueue
    @param self Container of the data structure in where the order will be positioned later
    @param _orderId Id of the order to be inserted
    @param _sender Owner of the new order
    @param _exchangeableAmount Amount that was left to be exchanged
    @param _reservedCommission Commission reserved to be charged later
    @param _price Target price of the order[base/secondary]
    @param _expiresInTick Number of tick in which the order can no longer be matched
  */
    function createOrder(
        Data storage self,
        uint256 _orderId,
        address _sender,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _expiresInTick
    ) private {
        // Next order is a position attribute so it should be set in another place
        self.orders[_orderId] = Order(
            _orderId,
            _exchangeableAmount,
            _reservedCommission,
            _price,
            0,
            _sender,
            _expiresInTick
        );
    }

    /**
    @notice Positions an order in the provided orderbook
    @param self Container of the orderbook
    @param _orderId Id of the order to be positioned
    @param _previousOrderId Id of the order that should be immediately before the newly positioned order, 0 if should go at the start
   */
    function positionOrder(
        Data storage self,
        uint256 _orderId,
        uint256 _previousOrderId
    ) private {
        Order storage order = get(self, _orderId);
        self.length = self.length.add(1);
        if (_previousOrderId != 0) {
            Order storage previousOrder = get(self, _previousOrderId);
            order.next = previousOrder.next;
            previousOrder.next = _orderId;
        } else {
            order.next = self.firstId;
            self.firstId = _orderId;
        }
    }

    /**
    @notice Positions an order in the provided pendingQueue
    @param self Container of the pendingQueue
    @param _orderId Id of the order to be positioned as pending
   */
    function positionOrderAsPending(Data storage self, uint256 _orderId)
        private
    {
        if (self.amountOfPendingOrders != 0) {
            Order storage previousLastOrder = self.orders[self
                .lastPendingToPopId];
            previousLastOrder.next = _orderId;
        } else {
            self.firstPendingToPopId = _orderId;
        }
        self.lastPendingToPopId = _orderId;
        self.amountOfPendingOrders = self.amountOfPendingOrders.add(1);
    }

    /**
    @notice Finds previous order for a new order with a given price in a given orderbook
    @param self Container of the orderbook
    @param _price Price of the order to possition
   */
    function findPreviousOrderToPrice(Data storage self, uint256 _price)
        public
        view
        returns (uint256)
    {
        if (self.length == 0) {
            return 0;
        }

        Order storage pivotOrder = first(self);
        bool newPriceGoesFirst = priceGoesBefore(
            self,
            _price,
            pivotOrder.price
        );
        if (newPriceGoesFirst) {
            return 0;
        }
        if (pivotOrder.next != 0) {
            Order storage nextOrder = get(self, pivotOrder.next);
            newPriceGoesFirst = priceGoesBefore(self, _price, nextOrder.price);

            while (!newPriceGoesFirst && pivotOrder.next != 0) {
                pivotOrder = nextOrder;

                if (pivotOrder.next != 0) {
                    nextOrder = get(self, pivotOrder.next);
                    newPriceGoesFirst = priceGoesBefore(
                        self,
                        _price,
                        nextOrder.price
                    );
                }
            }
        }
        return pivotOrder.id;
    }

    /**
    @dev Iterates though self Order collection starting from _startFromId until finding order with id _targetId
    @param self collection where to look for
    @param _targetId Order it for wich to find the previous
    @param _startFromId hint id to start iterating from, if zero, will search from begining
    @return true if found
    @return the Orders starage pointer, should not be used if not found
  */
    function findPreviousOrder(
        Data storage self,
        uint256 _targetId,
        uint256 _startFromId
    ) public view returns (bool found, Order storage prevOrder) {
        uint256 startFromId = _startFromId == 0 ? self.firstId : _startFromId;
        Order storage pivotOrder = get(self, startFromId);
        found = pivotOrder.next == _targetId;

        while (!found && !isLastOfOrderbook(pivotOrder)) {
            pivotOrder = get(self, pivotOrder.next);
            found = pivotOrder.next == _targetId;
        }
        return (found, pivotOrder);
    }

    /**
    @notice Returns true if an order with a _price should go before a prexistent order with _existingPrice in an orderbook
    @param _price New price to compare
    @param _existingPrice Existing order's price to compare
   */
    function priceGoesBefore(
        Data storage self,
        uint256 _price,
        uint256 _existingPrice
    ) private view returns (bool) {
        return
            (self.orderDescending && (_price > _existingPrice)) ||
            (!self.orderDescending && (_price < _existingPrice));
    }

    /**
    @notice Returns an order by its _id in a given orderbook/pendingQueue container(self)
    @param self Container of the orderbook/pendingQueue
    @param _id Id of the order to get
   */
    function get(Data storage self, uint256 _id)
        internal
        view
        returns (Order storage)
    {
        return self.orders[_id];
    }

    /**
    @notice returns the next valid Order for the given _orderbook
    @dev gets the net Order, if not valid, recursivelly calls itself until finding the first valid or reaching the end
    @param _orderbook where the _orderId is from
    @param _tickNumber for current tick
    @param _orderId id of the order from with obtain the next one, zero if beginging
    @return next valid Order, id = 0 if no valid order found
   */
    function getNextValidOrder(
        Data storage _orderbook,
        uint64 _tickNumber,
        uint256 _orderId
    ) public view returns (Order storage) {
        Order storage next = _orderId == 0
            ? first(_orderbook)
            : getNext(_orderbook, _orderId);
        if (next.id == 0 || !isExpired(next, _tickNumber)) return next;
        else return getNextValidOrder(_orderbook, _tickNumber, next.id);
    }

    /**
    @notice Returns the order following an order which id is _id in a given orderbook/pendingQueue container(self)
    @param self Container of the orderbook
    @param _id Id of the order to get the next from
   */
    function getNext(Data storage self, uint256 _id)
        internal
        view
        returns (Order storage)
    {
        return self.orders[(self.orders[_id]).next];
    }

    /**
    @notice Returns the first of order of an orderbook
    @param self Container of the orderbook
   */
    function first(Data storage self) internal view returns (Order storage) {
        return self.orders[self.firstId];
    }

    /**
    @notice Returns the first order to be popped from the pendingQueue
    @param self Container of the pendingQueue
   */
    function firstPending(Data storage self)
        internal
        view
        returns (Order storage)
    {
        return self.orders[self.firstPendingToPopId];
    }

    /**
    @notice Returns true if the given order is expired
    @param _order Order to be checked
    @param _tickNumber Current tick number
   */
    function isExpired(Order storage _order, uint128 _tickNumber)
        internal
        view
        returns (bool)
    {
        require(_order.id != 0, "tried to see expiration of a null order");
        return _order.expiresInTick <= _tickNumber;
    }

    /** TokenPair **/

    /**
    @notice Returns the status of a pair
    @param _self Struct pair to be seen
    @return tickNumber Number of the current tick
    @return nextTickBlock Block in which the next tick will be able to run
    @return lastTickBlock Block in which the last tick started to run
    @return lastClosingPrice Emergent price of the last tick
    @return disabled True if the pair is disabled(it can not be inserted any orders); false otherwise
    @return EMAPrice The last calculated EMAPrice of the last tick
   */
    function getStatus(Pair storage _self)
        internal
        view
        returns (
            uint64 tickNumber,
            uint256 nextTickBlock,
            uint256 lastTickBlock,
            uint256 lastClosingPrice,
            bool disabled,
            uint256 EMAPrice
        )
    {
        tickNumber = _self.tickState.number;
        nextTickBlock = _self.tickState.nextTickBlock;
        lastTickBlock = _self.tickState.lastTickBlock;
        lastClosingPrice = _self.lastClosingPrice;
        disabled = _self.disabled;
        EMAPrice = _self.EMAPrice;
    }

    /**
    @notice inserts a new Order. Emits the NewOrderInserted event
    @dev the _exchangeableAmount + _reservedCommission of the corresponding Token will be locked in the _receiver address, by making an RRC20 transferFrom,
    note that the address will need to have allowance and the necesary balance.
    @param _self Pair (Base & Secondary Token) to insert Order for
    @param _id Id of the new order
    @param _exchangeableAmount Order amount to be inserted, baseToken when buy, secondary when sell
    @param _reservedCommission Commission reserved to allow to charge it later(at expiration/)
    @param _price price the user is willing to bid/ask for this order.
    @param _lifespan the amount of ticks that the order is going to ve available to match.
    @param _previousOrderIdHint previous order in the orderbook, used as on optimization to search for.
    @param _sender address of the account executing the insertion
    @param _isBuy true if it's a buy order, meaning the funds should be from base Token
  */
    function doInsertOrder(
        Pair storage _self,
        uint256 _id,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _lifespan,
        uint256 _previousOrderIdHint,
        address _sender,
        address _receiver,
        bool _isBuy
    ) public returns (uint256) {
        require(!_self.disabled, "Pair has been disabled");

        Token storage token = _isBuy ? _self.baseToken : _self.secondaryToken;

        require(
            token.token.transferFrom(
                _sender,
                _receiver,
                _exchangeableAmount.add(_reservedCommission)
            ),
            "Token transfer failed"
        );

        bool goesToPendingQueue = _self.tickStage != TickStage.RECEIVING_ORDERS;
        uint64 expiresInTick = _self.tickState.number + _lifespan;

        if (goesToPendingQueue) {
            insertOrderAsPending(
                token.orderbook,
                _id,
                _sender,
                _exchangeableAmount,
                _reservedCommission,
                _price,
                expiresInTick
            );
            emit NewOrderAddedToPendingQueue(_id, 0);
        } else {
            if (_previousOrderIdHint == INSERT_FIRST) {
                insertOrder(
                    token.orderbook,
                    _id,
                    _sender,
                    _exchangeableAmount,
                    _reservedCommission,
                    _price,
                    expiresInTick
                );
            } else {
                insertOrder(
                    token.orderbook,
                    _id,
                    _sender,
                    _exchangeableAmount,
                    _reservedCommission,
                    _price,
                    expiresInTick,
                    _previousOrderIdHint
                );
            }
            emitNewOrderEvent(
                _id,
                _self,
                _sender,
                _exchangeableAmount,
                _reservedCommission,
                _price,
                expiresInTick,
                _isBuy
            );
        }
    }

    /**
    @notice Converts an amount in secondary token currency to base token currency
    @param _secondary Amount to be converted[secondary]
    @param _price Price used to convert[base/secondary]
    @param _priceComparisonPrecision Fixed point used precision of _price
    @return _base Amount converted[base]
   */
    function convertToBase(
        uint256 _secondary,
        uint256 _price,
        uint256 _priceComparisonPrecision
    ) internal pure returns (uint256) {
        return _secondary.mul(_price).div(_priceComparisonPrecision);
    }

    /**
    @notice Returns true if the pair is valid i.e. it is initialized, false otherwise
   */
    function isValid(Pair storage _self) internal view returns (bool) {
        return
            address(_self.baseToken.token) != address(0) &&
            address(_self.secondaryToken.token) != address(0) &&
            _self.priceComparisonPrecision != 0;
    }

    /**
    @dev this wrapp responds more to a "stack-too-deep" problem than a desire function break drown
  */
    function emitNewOrderEvent(
        uint256 _orderId,
        Pair storage _self,
        address _sender,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        uint256 _price,
        uint64 _expiresInTick,
        bool _isBuy
    ) private {
        emit NewOrderInserted(
            _orderId,
            _sender,
            address(_self.baseToken.token),
            address(_self.secondaryToken.token),
            _exchangeableAmount,
            _reservedCommission,
            _price,
            _expiresInTick,
            _isBuy
        );
    }

    /**
    @dev iterates over the pair orderbook, simulating the match to obtain potencial closing price
    @return emergentPrice: AVG price of the last matched Orders
    @return lastBuyMatchId Id of the last Buy order to match
    @return lastBuyMatchAmount Amount of the last Buy order to match
    @return lastSellMatchId Id of the last Sell order to match
  */
    function getEmergentPrice(Pair storage _self)
        public
        view
        returns (
            uint256 emergentPrice,
            uint256 lastBuyMatchId,
            uint256 lastBuyMatchAmount,
            uint256 lastSellMatchId
        )
    {
        Order memory buy = getNextValidOrder(
            _self.baseToken.orderbook,
            _self.tickState.number,
            0
        );
        Order memory sell = getNextValidOrder(
            _self.secondaryToken.orderbook,
            _self.tickState.number,
            0
        );
        Order memory lastBuyMatch;
        Order memory lastSellMatch;

        while (shouldMatchMemory(buy, sell)) {
            lastBuyMatch = buy;
            lastSellMatch = sell;

            (uint256 limitingAmount, MatchType matchType) = compareIntents(
                buy.exchangeableAmount,
                buy.price,
                sell.exchangeableAmount,
                _self.priceComparisonPrecision
            );

            if (matchType == MatchType.DOUBLE_FILL) {
                buy = getNextValidOrder(
                    _self.baseToken.orderbook,
                    _self.tickState.number,
                    buy.id
                );
                sell = getNextValidOrder(
                    _self.secondaryToken.orderbook,
                    _self.tickState.number,
                    sell.id
                );
            } else if (matchType == MatchType.BUYER_FILL) {
                buy = getNextValidOrder(
                    _self.baseToken.orderbook,
                    _self.tickState.number,
                    buy.id
                );
                sell.exchangeableAmount = sell.exchangeableAmount.sub(
                    limitingAmount
                );
            } else if (matchType == MatchType.SELLER_FILL) {
                uint256 buyerExpectedSend = convertToBase(
                    limitingAmount,
                    buy.price,
                    _self.priceComparisonPrecision
                );
                sell = getNextValidOrder(
                    _self.secondaryToken.orderbook,
                    _self.tickState.number,
                    sell.id
                );
                buy.exchangeableAmount = buy.exchangeableAmount.sub(
                    buyerExpectedSend
                );
            } else {
                // TODO
                require(false, "wow this is a bad implementation");
            }
        }
        if (lastBuyMatch.id == 0) return (0, 0, 0, 0);

        emergentPrice = Math.average(lastBuyMatch.price, lastSellMatch.price);

        return (
            emergentPrice,
            lastBuyMatch.id,
            lastBuyMatch.exchangeableAmount,
            lastSellMatch.id
        );
    }

    function compareIntents(
        uint256 _buyAmount,
        uint256 _buyPrice,
        uint256 _sellAmount,
        uint256 _priceComparisonPrecision
    ) public pure returns (uint256 limitingAmount, MatchType matchType) {
        uint256 buyerIntent = _buyAmount.mul(_priceComparisonPrecision).div(
            _buyPrice
        );
        if (_sellAmount > buyerIntent) {
            return (buyerIntent, MatchType.BUYER_FILL);
        } else if (_sellAmount < buyerIntent) {
            return (_sellAmount, MatchType.SELLER_FILL);
        } else {
            return (_sellAmount, MatchType.DOUBLE_FILL);
        }
    }

    /**
    @notice Calculate the different amounts in the process of exchanging a buy order
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _buy the buy order to operate with
    @param _sell the sell order to operate with
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
    function executeMatch(
        CommissionManager _commissionManager,
        Pair storage _pair,
        Order storage _buy,
        Order storage _sell,
        uint256 _limitingAmount,
        uint256 _price
    ) internal {
        executeBuyerMatch(
            _commissionManager,
            _pair,
            _buy,
            _limitingAmount,
            _price
        );
        executeSellerMatch(
            _commissionManager,
            _pair,
            _sell,
            _limitingAmount,
            _price
        );
    }

    /**
    @notice Returns true if the orders should match taking into account its prices
    false otherwise
    @dev It is identical to shouldMatchMemory but it receives its params as storage
    It was done this way to save some gas
    @param buy Struct of buy order to be checked
    @param sell Struct of sell order to be checked
  */
    function shouldMatchStorage(Order storage buy, Order storage sell)
        private
        view
        returns (bool)
    {
        return sell.id != 0 && buy.id != 0 && buy.price >= sell.price;
    }

    /**
    @notice Returns true if the orders should match taking into account its prices
    false otherwise
    @dev It is identical to shouldMatchStorage but it receives its params as memory
    It was done this way to save some gas
    @param buy Struct of buy order to be checked
    @param sell Struct of sell order to be checked
  */
    function shouldMatchMemory(Order memory buy, Order memory sell)
        private
        pure
        returns (bool)
    {
        return sell.id != 0 && buy.id != 0 && buy.price >= sell.price;
    }

    /**
    @notice Operates the buy order, doing modifications in the orderbook and the respecting transfers
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _buy the buy order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
    function executeBuyerMatch(
        CommissionManager _commissionManager,
        Pair storage _pair,
        Order storage _buy,
        uint256 _limitingAmount,
        uint256 _price
    ) private {
        // calculates the amouts to exchange, the one to sent to the seller and the change that its going back to the buyer
        (uint256 buyerExpectedSend, uint256 buyerSent) = calculateAmountToExchange(
            _pair,
            _buy,
            _limitingAmount,
            _price
        );

        // calculates and retains the propotional commission for the exchange
        uint256 exchangeCommission = _commissionManager
            .chargeCommissionForMatch(
            _buy.exchangeableAmount,
            buyerSent,
            _buy.reservedCommission,
            address(_pair.baseToken.token)
        );

        // transfer the change back to the buyer, has the commission change in it
        // change created by the price difference favorable to the customer
        uint256 changeTransferred = transferChange(
            _pair,
            _buy,
            buyerSent,
            buyerExpectedSend,
            exchangeCommission
        );

        // edits the order according to the exchanged amount
        subtractAmount(_buy, buyerExpectedSend);

        emit BuyerMatch(
            _buy.id,
            buyerSent,
            exchangeCommission,
            changeTransferred,
            // transfer the buyed amount, 0 if the transfer failed
            SafeTransfer.doTransfer(
                _pair.secondaryToken.token,
                _buy.owner,
                _limitingAmount
            )
                ? _limitingAmount
                : 0,
            _buy.exchangeableAmount,
            _price,
            _pair.tickState.number
        );
    }

    /**
    @notice Calculate the two amounts in the process of exchanging a buy order
    @param _pair the pair where the order exist
    @param _buy the buy order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
    @return buyerSent, the amount to send to the seller
    @return change, the amount to send back to the buyer
  */
    function calculateAmountToExchange(
        Pair storage _pair,
        Order storage _buy,
        uint256 _limitingAmount,
        uint256 _price
    ) private view returns (uint256, uint256) {
        uint256 buyerExpectedSend = convertToBase(
            _limitingAmount,
            _buy.price,
            _pair.priceComparisonPrecision
        );
        uint256 buyerSent = convertToBase(
            _limitingAmount,
            _price,
            _pair.priceComparisonPrecision
        );
        return (buyerExpectedSend, buyerSent);
    }

    /**
    @notice Transfers the change of the buyers transaction. It is the surplus that it is resent to the
    buyer but in base token currency
    @param _pair Struct of the pair that it is being exchanged
    @param _order Order that should have the change transfered
    @param _amountSent Amount already sent to the buyer[seconady]
    @param _expectedSend Amount expected from the buyer[secondary]
    @param _commission Charged commission[secondary]
  */
    function transferChange(
        Pair storage _pair,
        Order storage _order,
        uint256 _amountSent,
        uint256 _expectedSend,
        uint256 _commission
    ) private returns (uint256) {
        // adding to the change the reserved commission to be returned proportional to the change
        uint256 buyerExpectedCommission = _expectedSend
            .mul(_order.reservedCommission)
            .div(_order.exchangeableAmount);
        uint256 changeToTransfer = _expectedSend.sub(_amountSent).add(
            buyerExpectedCommission.sub(_commission)
        );
        // For Token transfer, we use SafeTransfer to protect loop against individual reverts
        return
            SafeTransfer.doTransfer(
                _pair.baseToken.token,
                _order.owner,
                changeToTransfer
            )
                ? changeToTransfer
                : 0;
    }

    /**
    @notice Calculate the different amounts in the process of exchanging a sell order
    @param _commissionManager contract responsible for resolving commissions
    @param _pair the pair where the order exist
    @param _sell the sell order to operate
    @param _limitingAmount the amount in secondary token to be exchanged
    @param _price the emergent price to use when doing the calculuses
  */
    function executeSellerMatch(
        CommissionManager _commissionManager,
        Pair storage _pair,
        Order storage _sell,
        uint256 _limitingAmount,
        uint256 _price
    ) private {
        uint256 exchangeCommission = _commissionManager
            .chargeCommissionForMatch(
            _sell.exchangeableAmount,
            _limitingAmount,
            _sell.reservedCommission,
            address(_pair.secondaryToken.token)
        );

        uint256 sellerExpectedReturn = convertToBase(
            _limitingAmount,
            _sell.price,
            _pair.priceComparisonPrecision
        );
        uint256 buyerSent = convertToBase(
            _limitingAmount,
            _price,
            _pair.priceComparisonPrecision
        );
        uint256 surplus = buyerSent.sub(sellerExpectedReturn);

        // For Token transfer, we use SafeTransfer to protect loop against individual reverts
        if (
            !SafeTransfer.doTransfer(
                _pair.baseToken.token,
                _sell.owner,
                buyerSent
            )
        ) buyerSent = 0;

        subtractAmount(_sell, _limitingAmount);

        emit SellerMatch(
            _sell.id,
            _limitingAmount,
            exchangeCommission,
            buyerSent,
            surplus,
            _sell.exchangeableAmount,
            _price,
            _pair.tickState.number
        );
    }

    /**
    @notice Reduce Order amount by amount and the reservedCommission proportionally
    @param _order The order to reduce amount of
    @param _sent amount to be substracted. Must be smaller than order's current amount
   */
    function subtractAmount(MoCExchangeLib.Order storage _order, uint256 _sent)
        private
    {
        uint256 expectedCommission = _sent.mul(_order.reservedCommission).div(
            _order.exchangeableAmount
        );
        _order.reservedCommission = _order.reservedCommission.sub(
            expectedCommission
        );
        _order.exchangeableAmount = _order.exchangeableAmount.sub(_sent);
    }

    /**
    @notice returns funds to the owner, paying commission in the process and emits ExpiredOrderProcessed event
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _orderId expired order's id
    @param _exchangeableAmount order's remainin exchangeable amount
    @param _reservedCommission order's reserved commission
    @param _owner order's owner
    @return _transferResult, true if the transfer to _account was successful
   */
    function processExpiredOrder(
        CommissionManager _commissionManager,
        Token storage _token,
        uint256 _orderId,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        address _owner
    ) public returns (bool) {
        (bool transferResult, uint256 returnedAmount, uint256 commission, uint256 returnedCommission) = refundOrder(
            _commissionManager,
            _token.token,
            _exchangeableAmount,
            _reservedCommission,
            _owner,
            true
        );
        // If transfer fails, the order needs to be processed anyway. Just record that no funds where actually returned.
        if (!transferResult) returnedAmount = 0;
        emit ExpiredOrderProcessed(
            _orderId,
            _owner,
            returnedAmount,
            commission,
            returnedCommission
        );
        return transferResult;
    }

    /**
    @notice Match the next two orders to be matched
    @param _self Pair being matched
    @param _commissionManager Commission manager of the MoC Exchange
    @return True if there are more orders to be matched, false otherwise
   */
    function matchOrders(
        Pair storage _self,
        CommissionManager _commissionManager
    ) public returns (bool) {
        assert(_self.tickStage == TickStage.RUNNING_MATCHING);

        // If there are no matches, skip everything
        if (_self.pageMemory.matchesAmount == 0) {
            return false;
        }

        /* We're assigning the next order to match (in the case of a complete fill)
     * in these variables, but the new value is never used.
     * It's possible to delete some code and make the execution cheaper by
     * only having the getFirstForMatching functionality, but we believe
     * the stepFunction'll receive the number of steps to run in the near future
     * and then we'll need the next order to match again.
     */
        Order storage buy = getFirstForMatching(
            _commissionManager,
            _self.baseToken,
            _self.tickState.number
        );
        Order storage sell = getFirstForMatching(
            _commissionManager,
            _self.secondaryToken,
            _self.tickState.number
        );

        bool isLastMatch = buy.id == _self.pageMemory.lastBuyMatch.id &&
            sell.id == _self.pageMemory.lastSellMatch.id;
        // As last matching orders are known from the simulation, we could use them as loop exit condition
        (uint256 limitingAmount, MatchType matchType) = compareIntents(
            buy.exchangeableAmount,
            buy.price,
            sell.exchangeableAmount,
            _self.priceComparisonPrecision
        );
        executeMatch(
            _commissionManager,
            _self,
            buy,
            sell,
            limitingAmount,
            _self.pageMemory.emergentPrice
        );

        if (matchType == MatchType.DOUBLE_FILL) {
            buy = onOrderFullMatched(
                _commissionManager,
                _self.baseToken,
                buy,
                _self.tickState.number,
                _self.pageMemory.lastBuyMatch.id
            );
            sell = onOrderFullMatched(
                _commissionManager,
                _self.secondaryToken,
                sell,
                _self.tickState.number,
                _self.pageMemory.lastSellMatch.id
            );
        } else if (matchType == MatchType.BUYER_FILL) {
            buy = onOrderFullMatched(
                _commissionManager,
                _self.baseToken,
                buy,
                _self.tickState.number,
                _self.pageMemory.lastBuyMatch.id
            );
        } else if (matchType == MatchType.SELLER_FILL) {
            sell = onOrderFullMatched(
                _commissionManager,
                _self.secondaryToken,
                sell,
                _self.tickState.number,
                _self.pageMemory.lastSellMatch.id
            );
        } else {
            // TODO
            require(false, "Unknown type");
        }
        return !isLastMatch;
    }

    /**
    @notice Simulates a matching step i.e. making one step to make the emergent price
    @param _self Struct that represents the pair
    @return True if there are more orders to be matched, i.e. if the tick should
    call simulateMatchingStep again
   */
    function simulateMatchingStep(Pair storage _self) public returns (bool) {
        assert(_self.tickStage == TickStage.RUNNING_SIMULATION);

        // keep in mind, this is a reference to a struct member, so by modifying it
        // we're not modifying the 'real' orders
        Order storage buy = _self.pageMemory.lastBuyMatch;
        Order storage sell = _self.pageMemory.lastSellMatch;
        if (!shouldMatchStorage(buy, sell)) {
            return false;
        }

        (uint256 limitingAmount, MatchType matchType) = compareIntents(
            buy.exchangeableAmount,
            buy.price,
            sell.exchangeableAmount,
            _self.priceComparisonPrecision
        );

        if (matchType == MatchType.DOUBLE_FILL) {
            // the asignments from getNextValidOrder set the references
            // to point to the 'real' orders
            buy = getNextValidOrder(
                _self.baseToken.orderbook,
                _self.tickState.number,
                buy.id
            );
            sell = getNextValidOrder(
                _self.secondaryToken.orderbook,
                _self.tickState.number,
                sell.id
            );
            _self.pageMemory.matchesAmount = _self.pageMemory.matchesAmount.add(
                2
            );
        } else if (matchType == MatchType.BUYER_FILL) {
            buy = getNextValidOrder(
                _self.baseToken.orderbook,
                _self.tickState.number,
                buy.id
            );
            sell.exchangeableAmount = sell.exchangeableAmount.sub(
                limitingAmount
            );
            _self.pageMemory.matchesAmount = _self.pageMemory.matchesAmount.add(
                1
            );
        } else if (matchType == MatchType.SELLER_FILL) {
            uint256 buyerExpectedSend = convertToBase(
                limitingAmount,
                buy.price,
                _self.priceComparisonPrecision
            );
            sell = getNextValidOrder(
                _self.secondaryToken.orderbook,
                _self.tickState.number,
                sell.id
            );
            buy.exchangeableAmount = buy.exchangeableAmount.sub(
                buyerExpectedSend
            );
            _self.pageMemory.matchesAmount = _self.pageMemory.matchesAmount.add(
                1
            );
        } else {
            assert(false);
        }

        if (shouldMatchStorage(buy, sell)) {
            // this assignments copy:
            // https://solidity.readthedocs.io/en/v0.5.11/types.html#reference-types
            _self.pageMemory.lastBuyMatch = buy;
            _self.pageMemory.lastSellMatch = sell;
            return true;
        } else {
            return false;
        }
    }

    /**
    @notice gets the first not expired order of the orderbook, processing expired ones
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _tickNumber current tick Number
    @return the first valid order in the orderbook
  */
    function getFirstForMatching(
        CommissionManager _commissionManager,
        Token storage _token,
        uint64 _tickNumber
    ) private returns (Order storage) {
        Order storage order = first(_token.orderbook);
        if (isExpired(order, _tickNumber)) {
            processExpiredOrder(
                _commissionManager,
                _token,
                order.id,
                order.exchangeableAmount,
                order.reservedCommission,
                order.owner
            );
            return
                getNextValidOrderForMatching(
                    _commissionManager,
                    _token,
                    _tickNumber
                );
        }
        return order;
    }

    /**
    @notice Searchs for the following valid Order
    @param _commissionManager commission manager.
    @param _token order Token data
    @param _tickNumber current tick Number
    @return the following valid order in the orderbook
  */
    function getNextValidOrderForMatching(
        CommissionManager _commissionManager,
        Token storage _token,
        uint64 _tickNumber
    ) private returns (Order storage) {
        Order storage order = popAndGetNewTop(_token.orderbook);
        if (order.id == 0 || !isExpired(order, _tickNumber)) {
            return order;
        } else {
            processExpiredOrder(
                _commissionManager,
                _token,
                order.id,
                order.exchangeableAmount,
                order.reservedCommission,
                order.owner
            );
            return
                getNextValidOrderForMatching(
                    _commissionManager,
                    _token,
                    _tickNumber
                );
        }
    }

    /**
    @notice emits OrderFullMatch for the given _order and searchs for the following valid one
    @param _commissionManager commission manager.
    @param _token token with the orderbook where the order is placed
    @param _order the order that had matched completely
    @param _tickNumber current tick Number
    @param _lastOrderThatMatches last order id that matches
    @return the following valid order in the orderbook
  */
    function onOrderFullMatched(
        CommissionManager _commissionManager,
        Token storage _token,
        Order storage _order,
        uint64 _tickNumber,
        uint256 _lastOrderThatMatches
    ) private returns (Order storage) {
        if (_lastOrderThatMatches == _order.id) {
            // If we'd reached the target order id, we don't need the next valid, just the next
            return popAndGetNewTop(_token.orderbook);
        } else {
            return
                getNextValidOrderForMatching(
                    _commissionManager,
                    _token,
                    _tickNumber
                );
        }
    }

    /**
    @notice Gives back the corresponding order value to the given _account
    @param _commissionManager commission manager.
    @param _token ERC20 token to transfer from.
    @param _exchangeableAmount Exchangeable amount of the order
    @param _reservedCommission Reserved amount to be potentially used in a commission
    @param _account address of the order funds beneficiary
    @param _isExpiration if true, uses the commission rate for expirations, otherwise uses the cancelation one
    @return transferResult True if the transfer to _account was successful
    @return exchangeableAmount Amount tried to be transfered from the orders to the user
    @return chargedCommission Commission charged as penalization
    @return commissionToRetrun Amount tried to be trasfered from the commissions to the user
  */
    function refundOrder(
        CommissionManager _commissionManager,
        IERC20 _token,
        uint256 _exchangeableAmount,
        uint256 _reservedCommission,
        address _account,
        bool _isExpiration
    ) internal returns (bool, uint256, uint256, uint256) {
        uint256 chargedCommission = _commissionManager
            .chargeExceptionalCommission(
            _reservedCommission,
            address(_token),
            _isExpiration
        );
        uint256 commissionToReturn = _reservedCommission.sub(chargedCommission);
        bool transferResult = SafeTransfer.doTransfer(
            _token,
            _account,
            _exchangeableAmount.add(commissionToReturn)
        );
        return (
            transferResult,
            _exchangeableAmount,
            chargedCommission,
            commissionToReturn
        );
    }

    /**
    @notice Moves an order from the pending queue to the corresponding orderbook
    @param _token Struct that containts the orderbook and pendingQueue data structures
    @param pageMemory Page memory of this tick, has auxiliar info to make it run. Hints are useful in this fn
    @param baseTokenAddress Address of the base token of the pair this order belongs to
    @param secondaryTokenAddress Address of the secondary token of the pair this order belongs to
    @param isBuy True if the _token and orderbook/pendingQueue in it are related to buy orders
    False otherwise
   */
    function movePendingOrderFrom(
        Token storage _token,
        TickPaginationMemory storage pageMemory,
        address baseTokenAddress,
        address secondaryTokenAddress,
        bool isBuy
    ) public returns (bool doneWork) {
        if (_token.orderbook.amountOfPendingOrders == 0) return false;
        // pop from queue
        Order storage orderToMove = firstPending(_token.orderbook);
        _token.orderbook.firstPendingToPopId = orderToMove.next;
        _token.orderbook.amountOfPendingOrders = _token
            .orderbook
            .amountOfPendingOrders
            .sub(1);

        // position orderToMove
        uint256 previousOrderId;
        if (pageMemory.hintIdsIndex < pageMemory.hintIds.length) {
            previousOrderId = pageMemory.hintIds[pageMemory.hintIdsIndex++];
            validatePreviousOrder(
                _token.orderbook,
                orderToMove.price,
                previousOrderId
            );
        } else {
            previousOrderId = findPreviousOrderToPrice(
                _token.orderbook,
                orderToMove.price
            );
        }

        emit NewOrderInserted(
            orderToMove.id,
            orderToMove.owner,
            baseTokenAddress,
            secondaryTokenAddress,
            orderToMove.exchangeableAmount,
            orderToMove.reservedCommission,
            orderToMove.price,
            orderToMove.expiresInTick,
            isBuy
        );

        positionOrder(_token.orderbook, orderToMove.id, previousOrderId);
        return true;
    }
}
