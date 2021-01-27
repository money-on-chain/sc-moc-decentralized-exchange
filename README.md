# TEX Smart Contracts

This is the Decentralized Token Exchange contracts (TEX) by Money On Chain

# Introduction

This set of smart contracts implements a system where the users are able to exchange their ERC20 tokenss. 
In this exchange the orders can be inserted anytime but the actual exchanges happen when match with other orders, 
until that moment the funds are in custody of the system. You can cancel at anytime to recover your funds.

## Concepts

### Tokens Pair

The way to exchange a token is through a pair that contains it. A pair, or a tokens pair, is a pair of token 
where one is considered the base token and the other one is the secondary token. This pairs are said to be listed 
in the exchange if you can exchange one token for the other inside it i.e. if an user wants to trade X token 
for an Y token there must be an X/Y token pair or a Y/X token pair. To add a new pair there must be a pair 
where the new base token is listed against the common base token "DOC".

### Secondary token - Base token

In a pair, the secondary token is seen as the good and the base token is seen as the medium of payment i.e. 
if a buy order is placed the sender is buying secondary tokens in exchange for base tokens meanwhile 
if a sell order is placed the sender is selling secondary tokens in exchange for base tokens.

### Limit Orders

Limit Orders (LO from now on) are a type of orders defined by an amount and the price to be paid/charged.
The price is always expressed in how much minimum units of base currency is being paid/charged for a minimum 
unit of the secondary token (take into account that the price is in fixed-point notation so the user 
has decimals to use for a finer grained management of what it wants to pay). That being said the price 
may not be the actual price in which the order matches but it is rather a limit (if the user is buying the 
price is an upper limit of how much he will be paying and if the user is selling the price is an lower limit
 of how much will be charging).
 
In the other hand, the amount is always the amount to be locked by the user , i.e. if the user is buying 
the locking amount of the base token and if the user is selling the locking amount of the secondary token. 
This amount already includes the commission charged so the amount to be exchanged will actually be less 
than the locked one.

The order can be executed partially too, i.e. an order can be matched with N orders in M different ticks. 
The orders can be matched with limit and market orders.

### Market Orders

Market Orders (MO from now on) are a type of orders defined by an **exchangeable amount** of tokens and 
the **multiply factor** to be used to compute the final price of the order.

The multiply factor allows determining the competitiveness of market orders and is used to calculate the price 
of the token:

```sol
Order Token Price = Market Price * Multiply Factor
```

The market price is always expressed in how much units of base currency is being paid/charged for a minimum 
unit of the secondary token. The market price is obtained with price providers

In the other hand, the exchangeable amount is the amount to be locked by the user minus fee , i.e. if the user is 
buying the exchangeable amount of the base token and if the user is selling the locking amount of the secondary token.
The order can be executed partially too, i.e. an order can be matched with N orders in M different ticks. 
The orders can be matched with limit and market orders.

### Orderbook

An orderbook is a data structure where the orders are saved. There exists two orderbook for each pair, one for 
sell limit orders and the other for buy limit orders. Both have to be ordered by price at all times to 
minimize the gas paid in a tick. In particular, the buy orderbook has to be ordered with a descending price 
and the sell orderbook has to be ordered with an increasing price so the most competitive orders are at the start of it.

The two orderbooks also save market orders. One of them for sell orders and the other for buy market orders. 
Both have to be ordered by **multiplyFactor** at all times to minimize the gas paid in a tick. 
The buy orderbook has to be ordered with a descending multiplyFactor and the sell orderbook has to be ordered 
with an increasing multiplyFactor so the most competitive orders are at the start of it.

### Emergent price

The emergent price is a price calculated given the orders that are present in a pair. In this particular case 
it is calculated as the average price of the last two matching orders. The last matching orders are the ones 
that have matching prices (i.e. the buy price is greater or equal than the sell price) and are the 
last to be processed in a matching process or tick. In order to get it we have to simulate the actual matching process.

### Tick

A tick is the process in which the orders are matched. In it we calculate the emergent price and later 
match the orders. The process starts taking the most competitive orders of each type(buy and sell). 
Given that orders we proceed to match them if they are able to match (i.e. the buy price is greater or 
equal than the sell price), if only one order is filled we take the next one of that orderbook while if 
both gets filled we advance in both orderbook and continue with the process until we reach a pair of orders 
where they have no matching prices. All the remaining orders are left for the next tick.
The surplus generated (i.e. the difference between the limit price and the emergent price in the tick) are given 
back to the user in the same process. If the user sent a buy order the surplus is given as change of the 
transaction because some of the base token it locked is returned. In the case of a sell order the 
surplus is given as extra base token paid for the sold tokens.

### Lifespan

The lifespan of an order is the amount of ticks the order will live, after that amount of ticks the order 
will be expired and no longer be matched.

### Pending Queue

When the tick is running the orders can not be inserted in the orderbook so we actually put them in a 
pending queue to actually move them at the end of the tick.

## Pair states

Any pair can have many states and the states of each pair is NOT related to the state of the others.


### Tick states

There are four states of the tick and they are independent for each pair.

#### Receiving orders

This state is the one where the tick is actually not running and the contract can insert orders directly 
in the orderbooks of that pair.


#### Matching orders

In this state the contract is actually matching the orders and returning the funds to the users. 
The orders inserted while in this state go to the pending queue.
The execution of the tick in this step will be more efficient(and prevent/fix some gas limit softlock) 
if the expired orders are processed beforehand.

#### Moving pending orders

In this state the contract is moving the orders from the pending queue to the main orderbooks. 
The orders inserted in this state go to the pending queue too.


[Continue reading ... ](OVERVIEW.md)


# Getting Started

## Install dependencies

- Use nodejs v8.12: `nvm install 8.12 && nvm alias default 8.12`
- Install local dependencies: `npm install`

## Node

You need a node to run contracts. Ganache cli for developing purpose

1. Ganache-cli

- Globally:

```sh
npm install -g ganache-cli;
ganache-cli
```

- Using Docker:

```sh
docker pull trufflesuite/ganache-cli;
docker run -d -p 8545:8545 trufflesuite/ganache-cli:latest
```

2. Rsk Local Node

- With Docker:
  See this repo: https://github.com/rsksmart/artifacts/tree/master/Dockerfiles/RSK-Node

## Tests

**Tests**

- run: `npm run test`

**Tests With Coverage**

- `npm run coverage`
- browse: [./coverage/index.html](./coverage/index.html)

## Deploy

[Truffle suit](https://github.com/trufflesuite/truffle) is recommended to compile and deploy the contracts.

1.  Edit truffle-config.js and change add network changes and point to your
    ganache cli or rsk node.

2.  Edit migrations/config.json and make changes

3.  Run `npm run truffle-compile` to compile the code

4.  Run `npm run truffle-migrate-dev` to deploy the contracts

# Deployed Enviroments

**Network**: RSK Mainnet
**Type**: Production
**Chain id**: 30

#### Pairs Operated in mainnet


Token pair      | Base Token address                          | Secondary Token address                     | MO
--------------- | ------------------------------------------- | ------------------------------------------- | -----
DOC/WRBTC        | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0  | Yes
DOC/RDOC         | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x2d919F19D4892381D58edeBeca66D5642Cef1a1f  | Yes
DOC/BPRO         | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8  | Yes
WRBTC/BPRO       | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0 | 0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8  | Yes
DOC/RIF          | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5  | Yes
RDOC/RIFP        | 0x2d919F19D4892381D58edeBeca66D5642Cef1a1f | 0xf4d27c56595Ed59B66cC7F03CFF5193e4bd74a61  | Yes
RIF/RIFP         | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5 | 0xf4d27c56595Ed59B66cC7F03CFF5193e4bd74a61  | Yes
WRBTC/RIF        | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0 | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5  | No


#### Commission Status

```
┏━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Storage               ┃ Value                                      ┃
┡━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Beneficiary           │ 0xC61820bFB8F87391d62Cd3976dDc1d35e0cf7128 │
│ Commission Rate       │ 0.001                                      │
│ Cancelation Rate      │ 0                                          │
│ Expiration Rate       │ 0.2                                        │
│ Minimum Fix Commision │ 0.5                                        │
│ Fee 0.001 WRBTC       │ 0.000051                                   │
│ Fee 10 DOC            │ 0.01005                                    │
└───────────────────────┴────────────────────────────────────────────┘

```

#### Contract verification


| Contract                      | Proxy                           | Implementation                 |
| :---------------------------- | -----------------------------   | ------------------------------ |
| MoCDecentralizedExchange | [0x4ebd075534d9E24cE134f8BC962311c913730a84](https://explorer.rsk.co/address/0x4ebd075534d9E24cE134f8BC962311c913730a84) | [0xEC8A7473e7aC0DB598f028Af2b5ba6B65afc3ea8](https://explorer.rsk.co/address/0xEC8A7473e7aC0DB598f028Af2b5ba6B65afc3ea8) | 
| CommissionManager | [0xfBBEA67566844601fFB8ABe8FC2E7E6547A408f0](https://explorer.rsk.co/address/0xfBBEA67566844601fFB8ABe8FC2E7E6547A408f0) | [0xE190B137663A2101c00d7F3d98FD0F8D46D58e0b](https://explorer.rsk.co/address/0xE190B137663A2101c00d7F3d98FD0F8D46D58e0b) | 
| MoCExchangeLib | [0x12ede3eEBF9e3FD6317cFBCb3ebfc762Db954d68](https://explorer.rsk.co/address/0x12ede3eEBF9e3FD6317cFBCb3ebfc762Db954d68) | [0x12ede3eEBF9e3FD6317cFBCb3ebfc762Db954d68](https://explorer.rsk.co/address/0x12ede3eEBF9e3FD6317cFBCb3ebfc762Db954d68) | 

The code is verified in explorer and in blockscout site.

The current code of the contract is release v1.3.2, you can flatten the contracts code to compare running the script:  `npm run flatten-contracts`.

Also you can obtain the implementation address from proxy address with this [script](https://github.com/money-on-chain/py_Moneyonchain/blob/master/examples/dex/deploy/info.py)


# Tex Integration

Please read [tex integration ...](integration-to-TEX.md)