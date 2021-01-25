# Integration to TEX Platform

1.  [Introduction to TEX](#introduction-to-tex)
    1.  [Tokens](#tokens-pair)
    1.  [Tokens Pair](#tokens-pair)
    1.  [Orderbook](#orderbook)
    1.  [Limit Orders](#limit-orders)
    1.  [The MoCDecentralizedExchange Contract](#the-mocdecentralizedexchange-contract)
    1.  [Current tokens](#current-tokens)
2.  [Setting allowance](setting-allowance)
1.  [Inserting an Order](#inserting-an-order)
    1.  [Inserting a Buy Order](#inserting-a-buy-order)
    1.  [Inserting a Sell Order](#inserting-a-sell-order)
1.  [Canceling an order](#canceling-an-order)
1.  [From outside the blockchain](#from-outside-of-the-blockchain)
    1.  [Using RSK nodes](#using-rsk-nodes)
    1.  [Using web3](#using-web3)
    1.  [Official TEX ABIS](#official-tex-abis)
    1.  [Events](#events)
    1.  [Example code inserting orders](#example-code-inserting-orders)
    1.  [Example code inserting orders without truffle](#example-code-inserting-orders-without-truffle)
    1.  [Example code canceling orders](#example-code-canceling-orders)

# Introduction to TEX

TEX is decentralized token exchange for the trading of [ERC-20 tokens](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) 
tokens on the RSK Blockchain and is based on **[Orderbooks (OB)](#orderbook)** and periodic **ticks**.

The users insert **orders** in the orderbook between **ticks** and every regular interval of time the match process is 
executed and to close the operations. The funds are in custody of the system until the match process finishes.

## Tokens

- A bitcoin-collateralized stable-coin, Dollar On Chain, (DoC)
- A passive income hodler-targeted token, BitPro (BPRO)
- A token used in decentralized economies with RSK (RIFX series).


**RSK Mainnet table tokens**

Token Name             | Token Symbol | Address
---------------------- | -------------| -------------
Dollar on Chain        | DOC          | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db
Wrapped RBTC           | WRBTC        | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0
BitPro                 | BPRO         | 0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8
RIF                    | RIF          | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5
RIFPro                 | RIFP         | 0xf4d27c56595Ed59B66cC7F03CFF5193e4bd74a61
RIFDOC                 | RDOC         | 0x2d919F19D4892381D58edeBeca66D5642Cef1a1f


**RSK Testnet table tokens**

Token Name             | Token Symbol | Address
---------------------- | -------------| -------------
Dollar on Chain        | DOC          | 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0
Wrapped RBTC           | WRBTC        | 0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E
BitPro                 | BPRO         | 0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf
RIF                    | RIF          | 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE
RIFPro                 | RIFP         | 0x23A1aA7b11e68beBE560a36beC04D1f79357f28d
RIFDOC                 | RDOC         | 0xC3De9F38581f83e281f260d0DdbaAc0e102ff9F8


## Wrapped RBTC

This is a token exchange you can't exchange token with base money, you can only exchange with tokens. You need first
transform your base RBTC in WRBTC if you want to use you RBTC. This operation RBTC->WRBTC is called Wrap, and the operation
WRBTC->RBTC is unwrap.

## Tokens Pair

It is a pair of token where one is considered the **base token** and the other one is the **secondary token**. 
If an user wants to trade an X token for a Y token there must exist an X/Y token pair or a Y/X token pair.

The secondary token is seen as the **good** and the base token is seen as the medium of **payment**. 
A user can create two types of orders:

- **Buy orders**: the sender is buying _secondary tokens_ in exchange for _base tokens_.
- **Sell order**: the sender is selling _secondary tokens_ in exchange for _base tokens_.

**RSK Mainnet tokens pairs avalaibles**

Token pair      | Base Token address                          | Secondary Token address
--------------- | ------------------------------------------- | -------------------------
DOC/WRBTC        | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0
DOC/RDOC         | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x2d919F19D4892381D58edeBeca66D5642Cef1a1f
DOC/BPRO         | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8
WRBTC/BPRO       | 0x967f8799aF07DF1534d48A95a5C9FEBE92c53ae0 | 0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8
DOC/RIF          | 0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5
RDOC/RIFP        | 0x2d919F19D4892381D58edeBeca66D5642Cef1a1f | 0xf4d27c56595Ed59B66cC7F03CFF5193e4bd74a61
RIF/RIFP         | 0x2acc95758f8b5f583470ba265eb685a8f45fc9d5 | 0xf4d27c56595Ed59B66cC7F03CFF5193e4bd74a61


**RSK tesnet tokens pairs avalaibles**

Token pair      | Base Token address                          | Secondary Token address
--------------- | ------------------------------------------- | -------------------------
DOC/WRBTC        | 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0 | 0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E
DOC/RDOC         | 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0 | 0xC3De9F38581f83e281f260d0DdbaAc0e102ff9F8
DOC/BPRO         | 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0 | 0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf
WRBTC/BPRO       | 0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E | 0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf
DOC/RIF          | 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0 | 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE
RDOC/RIFP        | 0xC3De9F38581f83e281f260d0DdbaAc0e102ff9F8 | 0x23A1aA7b11e68beBE560a36beC04D1f79357f28d
RIF/RIFP         | 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE | 0x23A1aA7b11e68beBE560a36beC04D1f79357f28d


## Orderbook

An orderbook is a data structure where the orders are saved. There are two orderbook for each tokens pair, one for 
**sell orders** and the other for **buy orders**.

## Limit Orders

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

### Price

The price is always expressed in how much minimum units of **base token** is being paid/charged for a minimum unit 
of the **secondary token**.

The price may not be the actual price in which the order matches but it is rather a limit.

- In case of **Buy LO** the price is an upper limit of how much the user will be paying.
- In **Sell LO** the user is selling the price is an lower limit of how much will be charging.

### Amount

The amount is always the amount to be locked by the user , i.e.

- In case of **Buy LO** is the locking amount of the base token.
- In case of **Sell LO** is the locking amount of the secondary token.

This amount already includes the **commission charged** so the amount to be exchanged will actually be 
less than the locked one.

## API and contract

API are set of tool to query the contracts from outside the blockchain, also you can use it from another contract.
In this document we are going to make example for api and contract.

### Requirements

To use api we need python installed in your machine and moneyonchain version 2.0.4 package installed. 
For contracts developing we need nodejs and truffle suit. 

* python >= 3.6

### Installation

* pip install moneyonchain==2.0.4

### Smart Contracts

To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. In this tutorial, 
we will show you how to do it using [Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), 
[Truffle Framework](https://www.trufflesuite.com/) and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. 
You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, please follow 
[this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) the only extra 
thing you need to do is to install our repo as a dependency in your NPM project. In order you need to do this you just 
need to run the following command.

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. 

## The MoCDecentralizedExchange Contract

MoCDecentralizedExchange is the main contract of the exchange, it is the entry point of almost all the operations 
of the platform. In this document we will focus on _insert_ and _cancel_ orders.

To get some new tokens you should interact with the suite. The entry point is the TEX smart contract whose 
addresses are available on the following networks:

- mainnet: [ 0x4ebd075534d9E24cE134f8BC962311c913730a84 ](https://explorer.rsk.co/address/0x4ebd075534d9E24cE134f8BC962311c913730a84)
- testnet: [ 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5 ](https://explorer.testnet.rsk.co/address/0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5)

For more information about TEX you can read [TEX architecture and smart contracts](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)

### TEX precisions

The TEX system handles different types of currency _precision_ to operate with ERC-20 tokens and RBTC. The current 
RSK EVM version does not "support" decimal values and it means that in TEX every value that is mathematically 
a decimal, it's represented as an integer adjusted by a given value, the _precision_.

Using unsigned int256 as the norm for all values, sets an upper limit to ~76 decimal places, so even if it's ok 
to multiply 18 precision values a couple of times, we need to be careful not to overflow nor lose precision.


# Setting allowance

When using TEX to sell or buy ERC20 tokens, there is a previous transaction necessary to insert a new order in 
the orderbook. We need to **approve** the tokens on the platform. This is a security measure for token holders.

The functions that interest us are the following:

```js
function approve(address _texContract, uint256 _allowedAmount) public returns (bool success)
function allowance(address _owner, address _texContract) public view returns (uint256 remaining)
```

## Approve

The approval transaction is used to grant permission for the smart contract to transfer a certain amount of the token, 
called allowance. The TEX smart contract will only be able to transfer the amount of token that a user approves.

The **approve** transaction is part of the ERC-20 standard and you can find more information [here](https://eips.ethereum.org/EIPS/eip-20).

You must call the approve function of every token that you use on the TEX platform.

### Parameters of the operation

#### The texContract parameter

Is the address of the TEX Platform to withdraw the token from the account a lot of times, up to the **allowedAmount** value.

#### The allowedAmount parameter

Is the allowed amount. If this function is invoked again then it overwrites the current allowance with \_allowedAmount value

### Possible failures

#### TEX Contract address is 0

It you send the address 0 in the \_texContract parameter it will revert with the message: "ERC20: approve to the zero address".

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by 
your wallet(you should read about them if you are developing and you don't know exactly what are they) 
but you should take them into account when trying to send all of your funds to aprove tokens.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, with a 
console or with an app.
​

#### Smart Contract​

​
You just have to import the contract **MoCDecentralizedExchange** contract and a ERC-20 interface. We recommend using [OpenZeppelin](https://openzeppelin.com/);
​

```js
import 'decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol';
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
```

Receive the address in the constructor in order to be able to interact with it later

```js
MoCDecentralizedExchange public tex;

constructor (MoCDecentralizedExchange _texContract, ...rest of your params) {
  tex = _texContract;
  ...
}
​
```
Then you call approve to set allowance.


```js
function yourSetAllowance(address _tokenAddress, uint256 _amount) public {
  IERC20 token = IERC20(_tokenAddress);
  bool success = token.approve(address(tex), _amount);
  require(success, "Approval not done");
}
```

You can check the new allowance with the following function.

```js
function getAllowance(address _tokenAddress) public view returns (uint256) {
  IERC20 token = IERC20(_tokenAddress);
  return token.allowance(msg.sender, address(tex));
}
```

#### Python scripts

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./1_approve.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:

```
from moneyonchain.networks import NetworkManager
from moneyonchain.tokens import WRBTCToken


connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()

account = '0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3'  # the account you want to allow
tex_address = '0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5'  # the tex address
token_address = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # token address
amount_allow = 0.001  # the amount you want to allow

token_wrbtc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

print("Allowing ... {0}".format(amount_allow))
token_wrbtc.approve(tex_address, amount_allow)

print("Token allowed amount: {0}".format(token_wrbtc.allowance(account, tex_address)))

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Allowing ... 0.001
Transaction sent: 0x89fe063af9034d5b84f3aec0721f32ca14be74d0e92d8db03b29fce4bcc4ac18
  Gas price: 0.06 gwei   Gas limit: 33641   Nonce: 1641
  WRBTC.approve confirmed - Block: 1554718   Gas used: 30583 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x89fe063af9034d5b84f3aec0721f32ca14be74d0e92d8db03b29fce4bcc4ac18
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 0
Function: WRBTC.approve
Block: 1554718
Gas Used: 30583 / 33641 (90.9%)

   Events In This Transaction
   --------------------------
   Approval
      src: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      guy: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      wad: 1000000000000000
Token allowed amount: 0.001

```


## Wrapped RBTC

This is a token exchange you can't exchange token with base money, you can only exchange with tokens. You need first
transform your base RBTC in WRBTC if you want to use you RBTC. This operation RBTC->WRBTC is called Wrap, and the operation
WRBTC->RBTC is unwrap.

The function wrap is the method deposit from the smartcontract and unwrap is the method withdraw like in the contract:

```
function deposit() public payable {
    balanceOf[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

function withdraw(uint256 wad) public {
    require(balanceOf[msg.sender] >= wad);
    balanceOf[msg.sender] -= wad;
    msg.sender.transfer(wad);
    emit Withdrawal(msg.sender, wad);
  }
```


#### WRAP Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./2_wrap.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from decimal import Decimal

from moneyonchain.networks import NetworkManager
from moneyonchain.tokens import WRBTCToken

connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()

token_address = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # token address
amount_to_wrap = Decimal(0.001)  # the amount you want to wrap

token_sc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

token_sc.deposit(amount_to_wrap)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Transaction sent: 0x7d73db07b50e8074f8d4649b6ce893ced18b07e2de3b2a715805097e39c88093
  Gas price: 0.06 gwei   Gas limit: 31075   Nonce: 1642
  WRBTC.deposit confirmed - Block: 1554733   Gas used: 28250 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x7d73db07b50e8074f8d4649b6ce893ced18b07e2de3b2a715805097e39c88093
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 1000000000000000
Function: WRBTC.deposit
Block: 1554733
Gas Used: 28250 / 31075 (90.9%)

   Events In This Transaction
   --------------------------
   Deposit
      dst: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      wad: 1000000000000000
```


#### UNWRAP Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./3_unwrap.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from decimal import Decimal

from moneyonchain.networks import NetworkManager
from moneyonchain.tokens import WRBTCToken

connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()

token_address = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # token address
amount_to_unwrap = Decimal(0.001)  # the amount you want to wrap

token_sc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

token_sc.withdraw(amount_to_unwrap)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Transaction sent: 0x0ae35f61b709b4f40f83d4472b2b799c5498c43bb9619d1fe2b53e331f800c2a
  Gas price: 0.06 gwei   Gas limit: 42890   Nonce: 1643
  WRBTC.withdraw confirmed - Block: 1554744   Gas used: 38991 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x0ae35f61b709b4f40f83d4472b2b799c5498c43bb9619d1fe2b53e331f800c2a
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 0
Function: WRBTC.withdraw
Block: 1554744
Gas Used: 38991 / 42890 (90.9%)

   Events In This Transaction
   --------------------------
   Withdrawal
      src: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      wad: 1000000000000000
```


# Inserting a Limit Order

In this tutorial we will show you how to insert a Buy and Sell Orders.

TEX uses ERC-20 tokens this means that you need wallets like **Nifty** and **MetaMask** to handle them if you tell 
them to ([MetaMask tutorial on how to do it](https://metamask.zendesk.com/hc/en-us/articles/360015489031-How-to-View-Your-Tokens), 
Nifty is very similar to it so you should follow that link too if you are using the latter).
​​

## Inserting a Buy Limit Order

In this tutorial the functions that is of interest to us are two:

```js
  function insertBuyLimitOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan) public
```

```js
 function insertBuyLimitOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public
```

The difference is that **insertBuyLimitOrderAfter** uses a hint to optimize the insertion. Each order has a unique ID.

### Parameters of the operation

#### The baseToken parameter

Is the address of the contract used to implement the ERC-20 base token. You can find more about
the current supported tokens [here](#current-tokens).

#### The secondaryToken parameter

Is the address of the contract used to implement the ERC-20 secondary token. You can find more about the current supported 
tokens [here](#current-tokens).

The token pair must exist in the TEX platform because it defines the precisions to use in _price_ and _amout_ parameter.

#### The amount parameter

It is the locking amount of the base token (the medium of payment).

This amount already includes the **commission charged** so the amount to be exchanged will actually be less than the locked one.

#### The price parameter

The price is always expressed in how much minimum units of **base token** is being paid for a minimum unit of 
the **secondary token**. The price is an upper limit of how much the user will be paying.

#### The lifespan parameter

Is the number of ticks that the order will be expired and no longer matched, must be lower or equal than the maximum 
(currently 10). It is a positive integer value.

#### The previousOrderIdHint parameter

It is previous order ID in the orderbook, used as on optimization to search for. It is used only in 
the `insertBuyLimitOrderAfter` function. It is a positive integer value.

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by 
your wallet(you should read about them if you are developing and you don't know exactly what are they) but you 
should take them into account when trying to send all of your funds to mint some BitPros.

### Possible failures

This operation may fail if one of the following scenarios occurs:

#### The TEX contract is paused:

If the system suffers some type of attack, the contract can be paused so that operations cannot be done and the
risk of the users losing their funds with the operation can be minimized. You can get more information about 
stoppables contracts [here](https://github.com/money-on-chain/Areopagus-Governance/blob/develop/contracts/Stopper/Stoppable.sol)
In that state, the contract doesn't allow minting any type of token.

To know if this is the case you can ask to **MoCDecentralizedExchange** if it's **paused()**.

#### You sent too low amount:

It reverts if the amount is not valid given a maximum in common base token currency and the error message will be "amount is not enough".

If the transaction reverts, all your funds will be returned (except the fee paid to the network). The minimum amount have to be greater

than 10 DOC or equivalent.

#### You sent too high lifespan:

If the lifespan is not valid given a maximum value then it reverts and sends the error message will be "Lifespan too high".

If the transaction reverts, all your funds will be returned (except the fee paid to the network).

#### Not valid price:

If the price is zero, it reverts and sends the error message will be "Price cannot be zero".

If the transaction reverts, all your funds will be returned (except the fee paid to the network).

#### Pair token does not exist

The token pair must exist in TEX platform. If a pair of base and secondary token does not exist, the transaction reverts 
with the message: "Token pair does not exist".

#### Pair token is disabled:

The token pair can be enabled or disabled. If it is disabled, the transaction reverts with the message: "Pair has been disabled".

#### Not enough gas:

If the gas limit sent is not enough to run all the code needed to execute the transaction, the transaction 
will revert(again, returning all your funds except the fee paid to the network). This may return an "out of gas"
error or simply a "revert" error because of the usage of the proxy pattern.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, 
with a console or with an app.
​

#### Smart Contract​

​
To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. In this 
tutorial, we will show you how to do it using [Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), 
[Truffle Framework](https://www.trufflesuite.com/) and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. 
You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, please follow 
[this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) 
the only extra thing you need to do is to install our repo as a dependency in your NPM project. 
In order you need to do this you just need to run the following command.
​

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. For this let's suppose you are doing 
some kind of contract that when executing a certain task charges a fixed commission to mantain your platform.
​
You just have to import the contract **MoCDecentralizedExchange** contract
​

```js
import 'decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol';
```

Receive the address in the constructor in order to be able to interact with it later

```js
constructor (MoCDecentralizedExchange _texContract, rest of your params...) {
//....rest of your constructor....
}
​
```

​You must know the addresses of the tokens that you want to use

````js
address constant private docAddress = 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0;
address constant private rifAddress = 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE;
​```

```js
function yourInsertBuyOrder(uint256 _amount, uint256 _price, uint64 _lifespan) public {
  uint256 yourCommissions = calcYourCommission(_price);
  docAddress.transfer(yourCommisionAddress, yourCommissions);
  tex.insertBuyOrder(docAddress, rifAddress, _amount - yourCommissions, _price, _lifespan);
}
````

​You can send it immediately to you so you can start using it right away.
​
This will leave you with a contract similar to the following
​​

```js
pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol";

contract YourInsertOrder {
    using SafeMath for uint256;
    MoCDecentralizedExchange public tex;
    address public baseTokenAddress;
    address public secondaryTokenAddress;
    address public commissionAddress;
    uint256 public buyOperations = 0;
    uint256 public totalAmountOfBuyWithoutCommissions = 0;

    constructor(
        MoCDecentralizedExchange _tex,
        address _base,
        address _secondary,
        address _commissionAddress
        ) public {
        tex = _tex;
        baseTokenAddress = _base;
        secondaryTokenAddress = _secondary;
        commissionAddress = _commissionAddress;
    }

    /**
      @notice Approves a token to use in TEX Platform.
      @param _tokenAddress addrress of the ERC-20 token
      @param _amount The amount to aprove
    */
    function setAllowance(address _tokenAddress, uint256 _amount) public {
      IERC20 token = IERC20(_tokenAddress);
      bool success = token.approve(address(tex), _amount);
      require(success, "Approval not done");
    }

    function yourInsertBuyOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {
        IERC20 base = IERC20(baseTokenAddress);
        require(base.allowance(msg.sender, address(tex)) > 0, "Base token without allowance");
        //Calc and trasfer the commission of your contract
        uint256 commissions = calcCommissions(_amount);
        bool success = base.transfer(commissionAddress, commissions);
        require(success, "Commission transfer failed");

        //Insert the new buy order at start
        tex.insertBuyLimitOrder(
            baseTokenAddress,
            secondaryTokenAddress,
            _amount.sub(commissions),
            _price,
            _lifespan);

        //Saves information to platform
        totalAmountOfBuyWithoutCommissions.add(_amount);
        buyOperations.add(1);
    }

    function calcCommissions(uint256 _amount) public view returns (uint256) {
        return _amount.div(100);
    }
}
```

And that is it, the only thing left to do is to add in the 
[truffle migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) 
scripts the address to TEX and the token when deploying YourInsertOrder and you are done.
​​


#### Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./4_insert_buy_limit_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange


connection_network='rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()

# instantiate DEX Contract
dex = MoCDecentralizedExchange(network_manager).from_abi()

base_token = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'  # DOC Token address
secondary_token = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # WRBTC Token address
amount = 0.001  # you want to purchase 0.0007 WRBTC
price = 14000  # the price in DOC of 1 WRBTC.
lifespan = 5  # the number of ticks your transaction are going to be alive.
amount_buy = amount * price

print("Insert buy limit order. Please wait to the transaction be mined!...")
tx_receipt = dex.insert_buy_limit_order(
    base_token,
    secondary_token,
    amount_buy,
    price,
    lifespan)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Insert buy limit order. Please wait to the transaction be mined!...
Transaction sent: 0xec67a456a1448bca0f8c28781cb5794c368608a6a62cd2165ccf65fae34b7129
  Gas price: 0.06 gwei   Gas limit: 253211   Nonce: 1650
  MoCDecentralizedExchange.insertBuyLimitOrder confirmed - Block: 1555245   Gas used: 230192 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0xec67a456a1448bca0f8c28781cb5794c368608a6a62cd2165ccf65fae34b7129
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.insertBuyLimitOrder
Block: 1555245
Gas Used: 230192 / 253211 (90.9%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      to: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 14000000000000000000
   Approval
      owner: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      spender: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 4902199999999999999290
   NewOrderInserted
      id: 162
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      baseTokenAddress: 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0
      secondaryTokenAddress: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
      exchangeableAmount: 13486000000000000000
      reservedCommission: 514000000000000000
      price: 14000000000000000000000
      multiplyFactor: 0
      expiresInTick: 65
      isBuy: True
      orderType: 0

```

## Inserting a Buy Market Order


#### Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./6_insert_buy_market_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange

connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()


# instantiate DEX Contract
dex = MoCDecentralizedExchange(network_manager).from_abi()

base_token = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'  # DOC Token address
secondary_token = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # WRBTC Token address
amount = 20  # you want to buy the equivalent to 20 DOC
multiply_factor = 1.01
lifespan = 7  # the number of ticks your transaction are going to be alive.

print("Insert buy market order. Please wait to the transaction be mined!...")
tx_receipt = dex.insert_buy_market_order(
    base_token,
    secondary_token,
    amount,
    multiply_factor,
    lifespan)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Insert buy market order. Please wait to the transaction be mined!...
Transaction sent: 0x808efa488fb77039fa3ed31282c32aebbb84a6c15875beab43694a5905d9c6c8
  Gas price: 0.06 gwei   Gas limit: 288203   Nonce: 1646
  MoCDecentralizedExchange.insertMarketOrder confirmed - Block: 1554808   Gas used: 262003 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x808efa488fb77039fa3ed31282c32aebbb84a6c15875beab43694a5905d9c6c8
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.insertMarketOrder
Block: 1554808
Gas Used: 262003 / 288203 (90.9%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      to: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 20000000000000000000
   Approval
      owner: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      spender: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 4916199999999999999290
   NewOrderInserted
      id: 160
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      baseTokenAddress: 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0
      secondaryTokenAddress: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
      exchangeableAmount: 19480000000000000000
      reservedCommission: 520000000000000000
      price: 0
      multiplyFactor: 1010000000000000008
      expiresInTick: 66
      isBuy: True
      orderType: 1

```

## Inserting a Sell Limit Order

In this tutorial the functions that is of interest to us are two:

```js
  function insertSellLimitOrder(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan) public
```

```js
 function insertSellLimitOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public
```

The difference is that **insertSellLimitOrderAfter** uses a hint to optimize the insertion. Each order has a unique ID.

### Parameters of the operation

#### The baseToken parameter

Is the address of the contract used to implement the ERC-20 base token. You can find more about
the current supported tokens [here](#current-tokens).

#### The secondaryToken parameter

Is the address of the contract used to implement the ERC-20 secondary token. You can find more about the current 
supported tokens [here](#current-tokens).

The token pair must exist in the TEX platform because it defines the precisions to use in _price_ and _amout_ parameter.

#### The amount parameter

The amount of the secondary token to be locked by the user.

This amount already includes the **commission charged** so the amount to be exchanged will actually be less than the locked one.

#### The price parameter

The price is always expressed in how much minimum units of **base token** is being paid for a minimum unit of 
the **secondary token**. The price is an lower limit of how much will be charging.

#### The lifespan parameter

Is the number of ticks that the order will be expired and no longer matched, must be lower or equal than the 
maximum (currently 10). It is a positive integer value.

#### The previousOrderIdHint parameter

It is previous order ID in the orderbook, used as on optimization to search for. It is used only in the 
`insertSellLimitOrderAfter` function. It is a positive integer value.

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by 
your wallet(you should read about them if you are developing and you don't know exactly what are they) 
but you should take them into account when trying to send all of your funds to mint some BitPros.

### Possible failures

This operation may fail if one of the following scenarios occurs:

#### The TEX contract is paused:

If the system suffers some type of attack, the contract can be paused so that operations cannot be done and the risk 
of the users losing their funds with the operation can be minimized. You can get more information about 
stoppables contracts [here](https://github.com/money-on-chain/Areopagus-Governance/blob/develop/contracts/Stopper/Stoppable.sol)
In that state, the contract doesn't allow minting any type of token.

To know if this is the case you can ask to **MoCDecentralizedExchange** if it's **paused()**.

#### You sent too low amount:

It reverts if the amount is not valid given a maximum in common base token currency and the error message will be 
"amount is not enough".

If the transaction reverts, all your funds will be returned (except the fee paid to the network).

#### You sent too high lifespan:

If the lifespan is not valid given a maximum value then it reverts and sends the error message will be "Lifespan too high".

If the transaction reverts, all your funds will be returned (except the fee paid to the network).

#### Not valid price:

If the price is zero, it reverts and sends the error message will be "Price cannot be zero".

If the transaction reverts, all your funds will be returned (except the fee paid to the network).

#### Pair token does not exist

The token pair must exist in TEX platform. If a pair of base and secondary token does not exist, the transaction 
reverts with the message: "Token pair does not exist".

#### Pair token is disabled:

The token pair can be enabled or disabled. If it is disabled, the transaction reverts with the message: 
"Pair has been disabled".

#### Not enough gas:

If the gas limit sent is not enough to run all the code needed to execute the transaction, the transaction will 
revert(again, returning all your funds except the fee paid to the network). This may return an "out of gas" error or 
simply a "revert" error because of the usage of the proxy pattern.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, 
with a console or with an app.
​

#### Smart Contract​

​
To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. 
In this tutorial, we will show you how to do it using 
[Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), [Truffle Framework](https://www.trufflesuite.com/) 
and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. 
You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, 
please follow [this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) 
the only extra thing you need to do is to install our repo as a dependency in your NPM project. 
In order you need to do this you just need to run the following command.
​

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. For this let's suppose you are doing 
some kind of contract that when executing a certain task charges a fixed commission.
​
You just have to import the contract **MoCDecentralizedExchange** contract
​

```js
import 'decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol';
```

Receive the address in the constructor in order to be able to interact with it later

```js
constructor (MoCDecentralizedExchange _texContract, rest of your params...) {
//....rest of your constructor....
}
​
```

​You must know the addresses of the tokens that you want to use

````js
address constant private docAddress = 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0;
address constant private rifAddress = 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE;
​```

```js

function yourInsertBuyOrder(uint256 _amount, uint256 _price, uint64 _lifespan) public {
  uint256 yourCommissions = calcYourCommission(_amount, _price);
  docAddress.transfer(yourCommisionAddress, yourCommissions);
  tex.insertSellLimitOrder(docAddress, rifAddress, _amount - yourCommissions, _price, _lifespan);
}
````

​You can send it immediately to you so you can start using it right away. In order to do this you should add a 
few more lines similar to the ones before, only that you will have to use the bpro token.
​
This will leave you with a contract similar to the following
​​

```js
pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol";

contract YourInsertOrder {
    using SafeMath for uint256;
    MoCDecentralizedExchange public tex;
    address public baseTokenAddress;
    address public secondaryTokenAddress;
    address public commissionAddress;
    uint256 public sellOperations = 0;
    uint256 public totalAmountOfSellWithoutCommissions = 0;

    constructor(
        MoCDecentralizedExchange _tex,
        address _base,
        address _secondary,
        address _commissionAddress
        ) public {
        tex = _tex;
        baseTokenAddress = _base;
        secondaryTokenAddress = _secondary;
        commissionAddress = _commissionAddress;
    }

    /**
      @notice Approves a token to use in TEX Platform.
      @param _tokenAddress addrress of the ERC-20 token
      @param _amount The amount to aprove
    */
    function setAllowance(address _tokenAddress, uint256 _amount) public {
      IERC20 token = IERC20(_tokenAddress);
      bool success = token.approve(address(tex), _amount);
      require(success, "Approval not done");
    }

    function yourInsertSellOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {
        IERC20 base = IERC20(secondaryTokenAddress);
        require(base.allowance(msg.sender, address(tex)) > 0, "2nd token without allowance");
        //Calc and transfer the commision of your platforms.
        uint256 commissions = calcCommissions(_amount);
        bool success = base.transfer(commissionAddress, commissions);
        require(success, "Commission transfer failed");

        //Insert the new buy order at start
        tex.insertSellLimitOrder(
            baseTokenAddress,
            secondaryTokenAddress,
            _amount.sub(commissions),
            _price,
            _lifespan);

        //Saves information to platform
        totalAmountOfSellWithoutCommissions.add(_amount);
        sellOperations.add(1);
    }

    function calcCommissions(uint256 _amount) public view returns (uint256) {
        return _amount.div(100);
    }
}
```


#### Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./5_insert_sell_limit_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange

connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()


# instantiate DEX Contract
dex = MoCDecentralizedExchange(network_manager).from_abi()

base_token = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'  # DOC Token address
secondary_token = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # WRBTC Token address
amount = 0.0007  # you want to sell 0.0007 WRBTC
price = 34000  # the price in DOC of 1 WRBTC.
lifespan = 5  # the number of ticks your transaction are going to be alive.

print("Insert sell limit order. Please wait to the transaction be mined!...")
tx_receipt = dex.insert_sell_limit_order(
    base_token,
    secondary_token,
    amount,
    price,
    lifespan)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Insert sell limit order. Please wait to the transaction be mined!...
Transaction sent: 0x5274f183dbc4296e75ad64acf53b65f19f6c4a923dd9c07e75fc6b047c944e0a
  Gas price: 0.06 gwei   Gas limit: 260099   Nonce: 1645
  MoCDecentralizedExchange.insertSellLimitOrder confirmed - Block: 1554783   Gas used: 236454 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x5274f183dbc4296e75ad64acf53b65f19f6c4a923dd9c07e75fc6b047c944e0a
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.insertSellLimitOrder
Block: 1554783
Gas Used: 236454 / 260099 (90.9%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      to: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 699999999999999
   NewOrderInserted
      id: 159
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      baseTokenAddress: 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0
      secondaryTokenAddress: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
      exchangeableAmount: 670455742212268
      reservedCommission: 29544257787731
      price: 34000000000000000000000
      multiplyFactor: 0
      expiresInTick: 64
      isBuy: False
      orderType: 0

```

## Inserting a Sell Market Order (MO)


#### Python script

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./7_insert_sell_market_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange

connection_network='rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()


# instantiate TEX Contract
dex = MoCDecentralizedExchange(network_manager).from_abi()

base_token = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'  # DOC Token address
secondary_token = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # WRBTC Token address
amount = 0.0007  # you want to sell 0.0007 WRBTC
multiply_factor = 1.01
lifespan = 7  # the number of ticks your transaction are going to be alive.

print("Insert sell market order. Please wait to the transaction be mined!...")
tx_receipt = dex.insert_sell_market_order(
    base_token,
    secondary_token,
    amount,
    multiply_factor,
    lifespan)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Insert sell market order. Please wait to the transaction be mined!...
Transaction sent: 0xf0ac5db7b4146346cd3d103fc3f1e13e4e472217e60b655132dda9192826bf9e
  Gas price: 0.06 gwei   Gas limit: 287815   Nonce: 1648
  MoCDecentralizedExchange.insertMarketOrder confirmed - Block: 1554832   Gas used: 261650 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0xf0ac5db7b4146346cd3d103fc3f1e13e4e472217e60b655132dda9192826bf9e
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.insertMarketOrder
Block: 1554832
Gas Used: 261650 / 287815 (90.9%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      to: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      value: 699999999999999
   NewOrderInserted
      id: 161
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      baseTokenAddress: 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0
      secondaryTokenAddress: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
      exchangeableAmount: 670696824710207
      reservedCommission: 29303175289792
      price: 0
      multiplyFactor: 1010000000000000008
      expiresInTick: 67
      isBuy: False
      orderType: 1
```

# Canceling an Order

In this tutorial the functions that is of interest to us are two:

```js
function cancelBuyOrder(
  address _baseToken,
  address _secondaryToken,
  uint256 _orderId,
  uint256 _previousOrderIdHint) public
```

```js
function cancelSellOrder(
  address _baseToken,
  address _secondaryToken,
  uint256 _orderId,
  uint256 _previousOrderIdHint) public
```

### Parameters of the operation

#### The baseToken parameter

Is the address of the contract used to implement the ERC-20 base token. You can find more about
the current supported tokens [here](#current-tokens).

#### The secondaryToken parameter

Is the address of the contract used to implement the ERC-20 secondary token. You can find more about the current 
supported tokens [here](#current-tokens).

The token pair must exist in the TEX platform because it defines the precisions to use in _price_ and _amout_ parameter.

#### The orderId parameter

Order id to cancel. It is an positive integer value.

#### The previousOrderIdHint parameter

It is previous order ID in the orderbook, used as on optimization to search for. It is a positive integer value.

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by your 
wallet(you should read about them if you are developing and you don't know exactly what are they) 
but you should take them into account when trying to send all of your funds to mint some BitPros.

### Possible failures

This operation may fail if one of the following scenarios occurs:

#### The TEX contract is paused:

If the system suffers some type of attack, the contract can be paused so that operations cannot be done and the 
risk of the users losing their funds with the operation can be minimized. You can get more information about stoppables 
contracts [here](https://github.com/money-on-chain/Areopagus-Governance/blob/develop/contracts/Stopper/Stoppable.sol)
In that state, the contract doesn't allow minting any type of token.

To know if this is the case you can ask to **MoCDecentralizedExchange** if it's **paused()**.

#### The Tick is Running:

The system runs a new tick, that is, it processes the buy and sell orders at regular intervals of time. 
Orders cannot be canceled while this process is running. If you try to do it then the transaction will reverts and 
the error message will be "Tick is running".

To know if this is the case you can ask to **MoCDecentralizedExchange** calling the following function 
that returns **true** if tick is running or **false** otherwise.

```js
function tickIsRunning(address _baseToken, address _secondaryToken) public view returns (bool)
```

#### Pair token does not exist

The token pair must exist in TEX platform. If a pair of base and secondary token does not exist, the 
transaction reverts with the message: "Token pair does not exist".

#### Pair token is disabled:

The token pair can be enabled or disabled. If it is disabled, the transaction reverts with the message: 
"Pair has been disabled".

#### Order not found:

If the orderId does not exist in TEX, the transaction reverts with the message: "Order not found".

#### Not authorized to cancel orders.

Only the owner, the user who created the order, can cancel an order. If another user try to cancel then 
the transaction reverts with the message: "Not order owner".

#### Not enough gas:

If the gas limit sent is not enough to run all the code needed to execute the transaction, the transaction 
will revert(again, returning all your funds except the fee paid to the network). This may return an 
"out of gas" error or simply a "revert" error because of the usage of the proxy pattern.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, 
with a console or with an app.
​

#### Smart Contract​

​
To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. 
In this tutorial, we will show you how to do it using [Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), 
[Truffle Framework](https://www.trufflesuite.com/) and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. 
You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, please follow 
[this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) 
the only extra thing you need to do is to install our repo as a dependency in your NPM project. 
In order you need to do this you just need to run the following command.
​

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. For this let's suppose you are 
doing some kind of contract that when executing a certain task charges a fixed commission.
​
You just have to import the contract **MoCDecentralizedExchange** contract
​

```js
import 'decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol';
```

Receive the address in the constructor in order to be able to interact with it later

```js
constructor (MoCDecentralizedExchange _texContract, rest of your params...) {
//....rest of your constructor....
}
​
```

​You must know the addresses of the tokens that you want to use

````js
address constant private docAddress = 0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0;
address constant private rifAddress = 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE;
​```

```js
function yourCancelBuyOrder(uint256 _orderId, uint256 _previousOrderIdHint) public {
  yourCancelLogic(_orderId, _previousOrderIdHint);
  tex.cancelBuyOrder(docAddress, rifAddress, _orderId, _previousOrderIdHint);
}
````

​You can send it immediately to you so you can start using it right away. In order to do this you should 
add a few more lines similar to the ones before, only that you will have to use the bpro token.
​
This will leave you with a contract similar to the following
​​

```js
pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/math/Math.sol";
import "decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol";

contract YourCancelOrder {
    using SafeMath for uint256;
    MoCDecentralizedExchange public tex;
    address public baseTokenAddress;
    address public secondaryTokenAddress;
    address public commissionAddress;
    uint256 public sellOperations = 0;
    uint256 public totalAmountOfSellWithoutCommissions = 0;
    uint256 public canceledOrders = 0;

    constructor(
        MoCDecentralizedExchange _tex,
        address _base,
        address _secondary,
        address _commissionAddress
        ) public {
        tex = _tex;
        baseTokenAddress = _base;
        secondaryTokenAddress = _secondary;
        commissionAddress = _commissionAddress;
    }

    function yourInsertSellOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {
        IERC20 base = IERC20(secondaryTokenAddress);
        //Calc and transfer the commision of your contract.
        uint256 commissions = calcCommissions(_amount);
        bool success = base.transfer(commissionAddress, commissions);
        require(success, "Commission transfer failed");

        //Insert the new buy order at start
        tex.insertSellOrder(
            baseTokenAddress,
            secondaryTokenAddress,
            _amount.sub(commissions),
            _price,
            _lifespan);

        //Saves information to platform
        totalAmountOfSellWithoutCommissions.add(_amount);
        sellOperations.add(1);
    }

    function yourCancelBuyOrder(uint256 _orderId, uint256 _previousOrderIdHint) public {
      canceledOrders.add(1);
      tex.cancelBuyOrder(baseTokenAddress, secondaryTokenAddress, _orderId, _previousOrderIdHint);
    }

    function calcCommissions(uint256 _amount) public view returns (uint256) {
        return _amount.div(100);
    }
}
```

#### Python script Cancel buy Order

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./8_cancel_buy_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange

connection_network = 'rskTesnetPublic'
config_network = 'dexTestnet'

# init network manager
# connection network is the brownie connection network
# config network is our enviroment we want to connect
network_manager = NetworkManager(
    connection_network=connection_network,
    config_network=config_network)

# run install() if is the first time and you want to install
# networks connection from brownie
# network_manager.install()

# Connect to network
network_manager.connect()

# instantiate DEX Contract
dex = MoCDecentralizedExchange(network_manager).from_abi()

base_token = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'  # DOC Token address
secondary_token = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # WRBTC Token address
order_id = 162
previous_order_id = 0

print("Order cancel. Please wait to the transaction be mined!...")
tx_receipt = dex.cancel_buy_order(
    base_token,
    secondary_token,
    order_id,
    previous_order_id)

# finally disconnect from network
network_manager.disconnect()

```

The result:

```
Order cancel. Please wait to the transaction be mined!...
Transaction sent: 0xf45da3ba345c4d5ff949ac0b1c3579356651ad2605b488c357346857b8529c73
  Gas price: 0.06 gwei   Gas limit: 137666   Nonce: 1651
  MoCDecentralizedExchange.cancelBuyOrder confirmed - Block: 1555248   Gas used: 62576 (45.45%)

Transaction was Mined 
---------------------
Tx Hash: 0xf45da3ba345c4d5ff949ac0b1c3579356651ad2605b488c357346857b8529c73
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.cancelBuyOrder
Block: 1555248
Gas Used: 62576 / 137666 (45.5%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      to: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      value: 14000000000000000000
   OrderCancelled
      id: 162
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      returnedAmount: 13486000000000000000
      commission: 0
      returnedCommission: 514000000000000000
      isBuy: True
```

#### Python script Cancel Sell Order

to run python script go to folder scripts/api:

```
cd scripts/api
export ACCOUNT_PK_SECRET=PK
python ./9_cancel_sell_order.py
```

where PK is your Private key, first you need to make changes to the script file with your data, accounts, tokens, etc.:


```
Order cancel. Please wait to the transaction be mined!...
Transaction sent: 0xbdc15398c63c05c14fce9a183d4787b0ac2c006a3ca08e6ba611eca609092bed
  Gas price: 0.06 gwei   Gas limit: 140724   Nonce: 1649
  MoCDecentralizedExchange.cancelSellOrder confirmed - Block: 1555193   Gas used: 63966 (45.45%)

Transaction was Mined 
---------------------
Tx Hash: 0xbdc15398c63c05c14fce9a183d4787b0ac2c006a3ca08e6ba611eca609092bed
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
Value: 0
Function: MoCDecentralizedExchange.cancelSellOrder
Block: 1555193
Gas Used: 63966 / 140724 (45.5%)

   Events In This Transaction
   --------------------------
   Transfer
      from: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      to: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      value: 699999999999999
   OrderCancelled
      id: 161
      sender: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      returnedAmount: 670696824710207
      commission: 0
      returnedCommission: 29303175289792
      isBuy: False
```


# From outside the blockchain

The logic of the TEX platform is developed with smart contracts that run on the RSK blockchain. 
To interact with this kind of technology, we developed a dApp (decentralized application), 
which is a web or mobile application that invokes the functions of the smart contracts.

You can find tutorials about developing dApps in the following resources:

- [The Ultimate Ethereum Dapp Tutorial (How to Build a Full Stack Decentralized Application Step-By-Step)](https://www.dappuniversity.com/articles/the-ultimate-ethereum-dapp-tutorial)

- [ETHEREUM PET SHOP -- YOUR FIRST DAPP](https://www.trufflesuite.com/tutorials/pet-shop)

- [RSK Truffle Boxes](https://developers.rsk.co/tools/truffle/boxes/)

The web3 library is one of the most popular to invoke the functions of smart contracts and there are different 
projects to use them with

- [javascript](https://web3js.readthedocs.io/)
- [Python](https://web3py.readthedocs.io/en/stable/)
- [Java and Android](https://docs.web3j.io/)
- [.NET](https://nethereum.readthedocs.io/en/latest/)
- [Swift](https://web3swift.io/)

[Truffle Framework](https://www.trufflesuite.com/) offers some template projects and tools that you can use to 
develop applications that use smart contracts.

We use **web3.js** and **truffle** in this tutorial.

An RSK smart contract is bytecode implemented on the RSK blockchain. When a smart contract is compiled, 
an ABI (application binary interface) is generated and it is required so that you can specify which contract 
function to invoke, as well as get a guarantee that the function will return the data in the format you expect.
The ABI in JSON format must be provided to web3 to build decentralized applications.

​

## Using RSK nodes

TEX contracts are executed on the RSK blockchain whose public nodes are testnet (testing environment) and 
mainnet (production environment). You can use a public node or install a node in your own server.

### Public node: RSK Testnet

- URL: https://public-node.testnet.rsk.co
- chainID: 31
- Cryptocurrency symbol: RBTC
- Explorer: https://explorer.testnet.rsk.co/

### Public node: RSK Mainnet

- URL: https://public-node.rsk.co
- chainID: 30
- Cryptocurrency symbol: RBTC
- Explorer: https://explorer.rsk.co/

### Truffle config: truffle.js

If you use truffle then you can use the following settings in your **truffle.js** file

```js
const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = 'YOUR_MNEMO_PRHASE';

module.exports = {
  compilers: {
    solc: {
      version: '0.5.8',
      evmVersion: 'byzantium',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1
        }
      }
    }
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    rskTestnet: {
      host: 'https://public-node.testnet.rsk.co',
      provider: new HDWalletProvider(mnemonic, 'https://public-node.testnet.rsk.co'),
      network_id: '31',
      gasPrice: 60000000
    },
    rskMainnet: {
      host: 'https://public-node.rsk.co',
      provider: new HDWalletProvider(mnemonic, 'https://public-node.rsk.co'),
      network_id: '30',
      gasPrice: 60000000
    }
  }
};
```

### Installing your own node

The RSK node can be installed on different operating systems such as Linux, Windows and Mac. It is also possible 
to run them in environments running docker and in cloud service providers such as AWS, Azure and Google. 
For more information check the [official RSK documentation](https://developers.rsk.co/rsk/node/install/)

## Using web3

You can use the technology that suits you best for your project to integrate with the TEX platform, but you 
must use web3 to invoke the functions of smart contracts. You can learn how to use it with the following tutorials:

- javascript: [Intro to Web3.js · Ethereum Blockchain Developer Crash Course](https://www.dappuniversity.com/articles/web3-js-intro)
- python: [Intro to Web3.py · Ethereum For Python Developers](https://www.dappuniversity.com/articles/web3-py-intro)
- Java an Android: [web3j Getting Started](https://docs.web3j.io/getting_started/)
- .NET: [Getting Started with Nethereum](http://docs.nethereum.com/en/latest/getting-started/)
- Swift: [Web3Swift README.md](https://github.com/zeriontech/web3swift)

​

## Official TEX ABIS

In the TEX repository you can compile the 
[official project of the platform](https://github.com/money-on-chain/sc-moc-decentralized-exchange). 
You can use them to build your own decentralized applications to invoke the functions of smart contracts.

We can also compile the contracts to generate the ABIS that will be saved in the _./build/contracts_
dir. You can do this with the following commands:

```
git clone https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
cd sc-moc-decentralized-exchange
npm install
npm run truffle-compile
```

Then we can check the abis

```
cd build/contracts/
ls -la
```

```
drwxrwxr-x 2 atixlabs atixlabs    4096 may 14 15:28 .
drwxrwxr-x 3 atixlabs atixlabs    4096 may 14 15:28 ..
-rw-rw-r-- 1 atixlabs atixlabs  138893 may 14 15:28 AddTokenPairChanger.json
-rw-rw-r-- 1 atixlabs atixlabs   58680 may 14 15:28 AdminUpgradeabilityProxy.json
-rw-rw-r-- 1 atixlabs atixlabs  172856 may 14 15:28 BaseAdminUpgradeabilityProxy.json
-rw-rw-r-- 1 atixlabs atixlabs   62099 may 14 15:28 BaseUpgradeabilityProxy.json
-rw-rw-r-- 1 atixlabs atixlabs   40327 may 14 15:28 BeneficiaryAddressChanger.json
...
```

## Events

When a transaction is mined, smart contracts can emit events and write logs to the blockchain that the frontend 
can then process. Click [here](https://media.consensys.net/technical-introduction-to-events-and-logs-in-ethereum-a074d65dd61e) 
for more information about events.

In the following example we will show you how to find events that are emitted by TEX smart contract in 
**RSK Testnet** blockchain with **truffle**.

### Code example: Events

[TODO] Write test to use TEX.

```js
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository
const MocExchange = require('../../build/contracts/MoCExchange.json');
const truffleConfig = require('../../truffle');

/**
 * Get a provider from truffle.js file
 * @param {String} network
 */
const getDefaultProvider = network =>
  truffleConfig.networks[network].provider || truffleConfig.networks[network].endpoint;

/**
 * Get a new web3 instance from truffle.js file
 */
const getWeb3 = network => {
  const provider = getDefaultProvider(network);
  return new Web3(provider, null, {
    transactionConfirmationBlocks: 1
  });
};

const web3 = getWeb3('rskTestnet');

const execute = async () => {
  web3.eth.defaultGas = 2000000;

  /**
   * Loads an specified contract
   * @param {ContractABI} abi
   * @param {String} contractAddress
   */
  const getContract = async (abi, contractAddress) => new web3.eth.Contract(abi, contractAddress);

  await getEvents();
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
```

See [getPastEvents](https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html?highlight=getPastEvents#events-allevents) 
for parameters and event structure details.

## Example code inserting orders

In the following example we will show how to insert an order in **testnet** with **truffle**.

You can find code examples into _/examples_ dir.
[TODO]: Write test to use TEX

```js
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const truffleConfig = require('../../truffle');

/**
 * Get a provider from truffle.js file
 * @param {String} network
 */
const getDefaultProvider = network =>
  truffleConfig.networks[network].provider || truffleConfig.networks[network].endpoint;

/**
 * Get a gasPrice from truffle.js file
 * @param {String} network
 */
const getGasPrice = network => truffleConfig.networks[network].gasPrice || 60000000;

/**
 * Get a new web3 instance from truffle.js file
 */
const getWeb3 = network => {
  const provider = getDefaultProvider(network);
  return new Web3(provider, null, {
    transactionConfirmationBlocks: 1
  });
};

const web3 = getWeb3('rskTestnet');
const gasPrice = getGasPrice('rskTestnet');

const execute = async () => {
  web3.eth.defaultGas = 2000000;

  /**
   * Loads an specified contract
   * @param {ContractABI} abi
   * @param {String} contractAddress
   */
  const getContract = async (abi, contractAddress) => new web3.eth.Contract(abi, contractAddress);

  /**
   * Transforms BigNumbers into
   * @param {BigNumber} number
   */
  const toContract = number => new BigNumber(number).toFixed(0);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
```

## Example code inserting orders without truffle

In the following example we will learn how to:

- Use the ABIs of TEX.
- Get the Pair Token Status.
- Insert sell and buy orders.

We will use the **testnet** network

First we create a new node project.

```
mkdir example-orders
cd example-orders
npm init
```

Let's add the necessary dependencies to run the project.

```
npm install --save bignumber.js
npm install --save web3
npm install --save truffle-hdwallet-provider
```

Now we create a new script called **insertOrders.js** with the following code:

[TODO] Write test to use TEX

```js
const HDWalletProvider = require('truffle-hdwallet-provider');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository

//Config params to TestNet
const endpoint = 'https://public-node.testnet.rsk.co';
//a mnemonic is 12 words instead of a single private key to sign the //transactions
const mnemonic = 'chase chair crew elbow uncle awful cover asset cradle pet loud puzzle';
const provider = new HDWalletProvider(mnemonic, endpoint);
const web3 = new Web3(provider);

//Contract addresses on testnet
const gasPrice = 60000000;

const execute = async () => {
  /**
   * Loads an specified contract
   * @param {json ABI} abi
   * @param {localhost/testnet/mainnet} contractAddress
   */
  const getContract = async (abi, contractAddress) => new web3.eth.Contract(abi, contractAddress);

  /**
   * Transforms BigNumbers into
   * @param {*} number
   */
  const toContract = number => new BigNumber(number).toFixed(0);

  function logEnd() {
    console.log('End Example');
  }
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
```

## Example code canceling orders

In the following example we will learn how to:

- Cancelling Orders

We will use **truffle** and **testnet** network.

First we create a new node project.

```
mkdir example-cancelling-orders
cd example-cancelling-orders
npm init
```

Let's add the necessary dependencies to run the project.

```
npm install --save web3
```

[TODO] Write test to use TEX

**Example**

```js
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository
const MocAbi = require('../../build/contracts/MoC.json');
const truffleConfig = require('../../truffle');

/**
 * Get a provider from truffle.js file
 * @param {String} network
 */
const getDefaultProvider = network =>
  truffleConfig.networks[network].provider || truffleConfig.networks[network].endpoint;

/**
 * Get a gasPrice from truffle.js file
 * @param {String} network
 */
const getGasPrice = network => truffleConfig.networks[network].gasPrice || 60000000;

/**
 * Get a new web3 instance from truffle.js file
 */
const getWeb3 = network => {
  const provider = getDefaultProvider(network);
  return new Web3(provider, null, {
    transactionConfirmationBlocks: 1
  });
};

const web3 = getWeb3('rskTestnet');
const gasPrice = getGasPrice('rskTestnet');
```
