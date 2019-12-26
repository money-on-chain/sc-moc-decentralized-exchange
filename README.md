# Decentralized Exchange - DEX

1. [Introduction](#introduction)
1. [Main Concepts](#main-concepts)
   1. [Tokens Pair](#tokens-pair)
   1. [Secondary token - Base token](#secondary-token-base-token)
   1. [Limit Order](#limit-order)
   1. [Orderbook](#orderbook)
   1. [Tick](#tick)
   1. [Pending Queue](#pending-queue)
1. [Tick states](#tick-states)
1. [Architecture](#architecture)
1. [Contracts](#contracts)
   1. [Dex](#dex-mocdecentralizedexchange)
   1. [CommissionManager](#commissionmanager)
1. [Relevant patterns and choices](#relevant-patterns-and-choices)
   1. [Safe Math and precision](#safe-math-and-precision)
   1. [Governance and Upgradability](#governance-and-upgradability)
   1. [Block gas limit prevention](#block-gas-limit-prevention)

# Introduction

This set of smart contracts implements a system where the users are able to exchange their ERC20 tokens present in the deployed network. In this exchange the orders can be inserted anytime but the actual exchanges happen at almost regular intervals, until that moment the funds are in custody of the system.

# Main Concepts

## Tokens Pair

The way to exchange a token is through a pair that contains it. A pair, or a tokens pair, is a pair of token where one is considered the base token and the other one is the secondary token. This pairs are said to be listed in the exchange if you can exchange one token for the other inside it i.e. if an user wants to trade X token for an Y token there must be an X/Y token pair or a Y/X token pair. To add a new pair there must be a pair where the new base token is listed against the common base token(which tipically will be DoC) or the new base token must be the common base token.

## Secondary token - Base token

In a pair, the secondary token is seen as the good and the base token is seen as the medium of payment i.e. if a buy order is placed the sender is buying secondary tokens in exchange for base tokens meanwhile if a sell order is placed the sender is selling secondary tokens in exchange for base tokens.

## Limit Orders

Limit Orders (LO from now on) are the only type of orders that can be inserted at the moment. This type of orders are defined by an amount and the price to be paid/charged.
The price is always expresed in how much minimum units of base currency is being paid/charged for a minimum unit of the secondary token(take into account that the price is in fixed-point notation so the user has decimals to use for a finer grained management of what it wants to pay). That being said the price may not be the actual price in which the order matches but it is rather a limit (if the user is buying the price is an upper limit of how much he will be paying and if the user is selling the price is an lower limit of how much will be charging).
In the other hand, the amount is always the amount to be locked by the user , i.e. if the user is buying the locking amount of the base token and if the user is selling the locking amount of the secondary token. This amount already includes the commission charged so the amount to be exchanged will actually be less than the locked one.
The order can be executed partially too, i.e. an order can be matched with N orders in M different ticks.

## Orderbook

An orderbook is a data structure where the orders are saved. There exists two orderbook for each pair, one for sell orders and the other for buy orders. Both have to be ordered by price at all times to minimize the gas paid in a tick. In particular, the buy orderbook has to be ordered with a descending price and the sell orderbook has to be ordered with an increasing price so the most competitive orders are at the start of it.

## Emergent price

The emergent price is a price calculated given the orders that are present in a pair. In this particular case it is calculated as the average price of the last two matching orders. The last matching orders are the ones that have matching prices (i.e. the buy price is greater or equal than the sell price) and are the last to be processed in a matching process or tick. In order to get it we have to simulate the actual matching process.

## Tick

A tick is the process in which the orders are matched. In it we calculate the emergent price and later match the orders. The process starts taking the most competitive orders of each type(buy and sell). Given that orders we proceed to match them if they are able to match (i.e. the buy price is greater or equal than the sell price), if only one order is filled we take the next one of that orderbook while if both gets filled we advance in both orderbook and continue with the process until we reach a pair of orders where they have no matching prices. All the remaining orders are left for the next tick.
The surplus generated (i.e. the difference between the limit price and the emergent price in the tick) are given back to the user in the same process. If the user sent a buy order the surplus is given as change of the transaction because some of the base token it locked is returned. In the case of a sell order the surplus is given as extra base token paid for the sold tokens.

## Lifespan

The lifespan of an order is the amount of ticks the order will live, after that amount of ticks the order will be expired and no longer be matched.

## Pending Queue

When the tick is running the orders can not be inserted in the orderbook so we actually put them in a pending queue to actually move them at the end of the tick.

# Pair states

Any pair can have many states and the states of each pair is NOT related to the state of the others.

## Enabled

Each pair can be enabled, disabled or not-added. If a pair has not been added yet no operation can be made on it until we add it, and once added no one can un-add it. Despite the latter the pair can be disabled in which case the insertions for that pair are no longer available. However, the other operations ARE still available in order to be able to remove/close the orders already open on it(A feature has been added to change the last closing price to be able to update disabled pair's prices through governance if wanted). The disabled state is reversible through governance.

## Tick states

There are four states of the tick and they are independent for each pair.

### Receiving orders

This state is the one where the tick is actually not running and the contract can insert orders directly in the orderbooks of that pair.

### Running simulation

This states is the first one where the tick is running. While the pair is in that state the emergent price is being calculated and the orders to be inserted in that pair go to the pending queue.
The execution of the tick in this step will be more efficient(and prevent/fix some gas limit softlock) if the expired orders are processed beforehand.

### Matching orders

In this state the contract is actually matching the orders and returning the funds to the users. The orders inserted while in this state go to the pending queue.
The execution of the tick in this step will be more efficient(and prevent/fix some gas limit softlock) if the expired orders are processed beforehand.

### Moving pending orders

In this state the contract is moving the orders from the pending queue to the main orderbooks. The orders inserted in this state go to the pending queue too.

# Architecture

The decentralized Exchange is a system built with smart contracts that allow the commercial exchange of ERC-20 tokens, including the Money on Chain tokens. In this sense, the smart contracts can be categorized into 4 categories:

- _Proxy Contracts_: It contains the functions that users can invoke to use the platform. These types of contracts can be updated in a new deployment. (MoCDecentralizedExchange, CommissionManager)
- _Pure logic Contracts & Libraries_: Functional extensions of the above merely to have responsibility separation and contracts size (aka deploy fee) low. (MoCExchangeLib, SafeTransfer, TickState)
- _Tokens_: ERC-20 Tokens backed by the MoC system and others ( BProToken, DocToken, WRBTC, RIF )
- _External Dependencies_: External contracts with which the system interacts, in this case, the previous ERC20 tokens and the governance system

# Contracts

## DEX MoCDecentralizedExchange

- References/uses: SafeMath, MoCExchangeLib
- Inherits from: EventfulExchange, RestrictiveOrderListing, PartialExecution

MoCDecentralizedExchange is the main contract of the exchange, it is the entry point of almost all public interactions with it and articulates the main logic and relationships between the rest of the contracts.
It does not receive RBTC. You will notice that many of your methods simply "redirect" the functions and data structures of MoCExchangeLib and the contracts from which it inherits; for example:

```sol
  /**
    @notice Disable the insertion of orders in a pair; the pair must have been added before
    @param _baseToken Address of the base token of the pair
    @param _secondaryToken Address of the secondary token of the pair
  */
  function disableTokenPair(address _baseToken, address _secondaryToken) public whenTickIsNotRunning(_baseToken, _secondaryToken) {
    TokenPairListing.disableTokenPair(_baseToken, _secondaryToken);
  }
```

Methods can be invoked only if the tick is not running

```sol
  /**
    @notice Checks that the tick of the pair is not running, fails otherwise
    @param _baseToken Address of the base token of the pair
    @param _secondaryToken Address of the secondary token of the pair
  */
  modifier whenTickIsNotRunning(address _baseToken, address _secondaryToken) {
    require(!tickIsRunning(_baseToken, _secondaryToken), "Tick is running");
    _;
  }
```

## CommissionManager

- Referenced by: MoCExchangeLib, OrderListing
- References/uses: SafeMath, Governed, Ownable
- Inherits from: Governed, Ownable
  This contract is in charge of keeping track of the charged commissions and calculating the commissions to reserve / charge depending on the operation and the amount of the order. Should only be called by `MoCDecentralizedExchange`.

# Relevant patterns and choices

## Safe Math and precision

DEX system requires many mathematical operations, in this model just the 2 basic operations are used (addition/subtraction, multiplication/division). To protect against overflows, OpenZeppelin SafeMath library is used on any of this operations. For example:

```sol
  /**
    @notice Calculates the commission to be charged for an order matching, also adds the said
    amount as a charged commission
    IT DOESN'T KEEP THE FUNDS NOR MOVES ANY
    @param _orderAmount order's exchangeableAmount amount
    @param _matchedAmount the order amount that is being exchanged in this iteration
    @param _commission the order reserved commission
    @param _tokenAddress the token that it's being exchanged
    @return the commission amount that its being charged in this iteration
  */
  function chargeCommissionForMatch(uint256 _orderAmount, uint256 _matchedAmount, uint256 _commission, address _tokenAddress)
    external onlyOwner returns(uint256) {
    assert(_orderAmount >= _matchedAmount);
    uint256 finalCommission = _matchedAmount.mul(_commission).div(_orderAmount);
    exchangeCommissions[_tokenAddress] = exchangeCommissions[_tokenAddress].add(finalCommission);
    return finalCommission;
  }
```

As current RSK EVM version does not "support" decimal values, it's also important to point out that in DEX every value that is mathematically a decimal, it's represented as an integer adjusted by a given value, which is called _precision_.
Even if many are equal, we keep them on separate variables to be able to adjust them accordantly on future formula changes.

```sol
contract CommissionManager is Governed, Ownable {
      using SafeMath for uint256;
      ...
      uint256 constant public RATE_PRECISION = uint256(10 ** 18);
      ...
}
```

Using unsigned int256 as the norm for all values, sets an upper limit to ~76 decimal places, so even if it's ok to multiply 18 precision values a couple of times, we need to be careful not to overflow nor lose precision.

## Governance and Upgradability

DEX and CommisionManger contracts subscribes to a governance implementation that allows an external contract to authorize changers to:

- Set single parameters values (for example, adjusting commission fee)

- Upgrade specific contracts to new versions (for example updating some formula to make it more efficient)

- Pause/Un-pause the whole system (intended as temporal halts for future upgrades)

For further detail on Governance mechanism refer to [Moc Governance project](https://gitlab.com/atixlabs/moc-governance)

## Block gas limit prevention

Although not recomended, dynamic array looping is needed to be performed on certain functions:

- On creating a new order without HINT
  This function is called when a new order is inserted in the OrderBook and the user does NOT specify the HINT.
  Each time a new order is created, the previous orders that the OrderBook is ordered are pivoted. When passing to another tick decreases the number of orders and possible to try an order. Another option in case the error occurs is that the user inserts the order specifying the HINT.

- On matching orders with hints
  Use the reserved word "delete" with an array that is created in each transaction. It is not possible to grow so much that it blocks another user.

- On matching orders/simulating the matching given there are expired orders
  It exists the possibility that the matching orders/simulation of the matching processes are not abled to be run because of a great amount of consecutive expired orders. This is solved with the possibility to process the expired orders, in a paginated way, before a tick is run and between the pages of a running tick.

There are other places where a dynamic array is looped but this other places are paginated in order to overcome a block gas limit softlocking.

_Note_: There is volume unit tests to prove cases of gas limit.

# Settings

**deployGovernance**: Boolean corresponding to whether governance contracts must be deployed.

**haveToAddTokenPairs**: Boolean corresponding to whether token pairs must be listed automatically after deploy. If value is _`false`_, then you must have to do it manually.

**governor**: The address of the contract that is going to be the governor. Not used if deployGovernance is set to _`true`_.

**stoppper**: The address of the contract that is going to be the stoppper. Not used if deployGovernance is set to _`true`_.

**proxyAdmin**: The address of the contract that is going to be the proxy admin. Not used if deployGovernance is set to _`true`_.

**upgradeDelegator**: The address of the contract that is going to be the upgrade delegator. Not used if deployGovernance is set to _`true`_.

**addressesToHaveBalance**: The account addressess to set balance in all existing tokens. Only used if _`existingTokens`_ is _`false`_.

**beneficiaryAddress**: The address of the account that is going to receive the fees of the transactions.

**existingTokens**: The tokens that are gonna be deployed. Usually they are listed as follows:

```json
"existingTokens": {
      "BproToken": {
        "address": "0x....."
      },
      "WRBTC": {
        "address": "0x....."
      },
      "DocToken": {
        "address": "0x....."
      },
      "TestToken": {
        "address": "0x....."
      }
    }
```

If you want to deploy new token addresses you set _`existingTokens`_ to _`false`_.

**MAX_PENDING_TXS**: Maximum quantity of pending transactions.

**ORDERS_FOR_TICK**: Expected orders to be matched on each tick.

**MAX_BLOCKS_FOR_TICK**: Maximum quantity of blocks between ticks.

**MIN_BLOCKS_FOR_TICK**: Minimum quantity of blocks between ticks.

**MIN_ORDER_AMOUNT**: The minimum amount of an order to restrict insertion.

**MAX_ORDER_LIFESPAN**: The maximum number of ticks that the order is going to be considered for trading.

**DEFAULT_PRICE_PRECISION**: The default price precision of tokens.

**TOKEN_DECIMALS**: Tokens precision. Only used if _`existingTokens`_ is set to _`false`_.

**COMMISSION_RATE**: The commission taken inserting new order. The commission has precision.

**CANCELATION_PENALTY_RATE**: The fee taken after an order is canceled.

**EXPIRATION_PENALTY_RATE**: The fee taken after an order is expired.

**TOKENS_TO_MINT**: The balance set in every token to the _`addressesToHaveBalance`_. Only used if _`existingTokens`_ is set to _`false`_.
