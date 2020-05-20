# Integration to TEX Platform

1.  [Introduction to TEX](#introduction-to-tex)
    1.  [Tokens Pair](#tokens-pair)
    1.  [Orderbook](#orderbook)    
    1.  [Limit Orders](#limit-orders)
    1.  [The MoCDecentralizedExchange Contract](#the-mocdecentralizedexchange-contract)
    1.  [Current tokens](#current-tokens)   
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

TEX is decentralized token exchange for the trading of [ERC-20 tokens](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) tokens on the RSK Blockchain and is based on **[Orderbooks (OB)](#orderbook)** and periodic **ticks**. 

The users insert **orders** in the orderbook between **ticks** and every regular interval of time the match process is executed and to close the operations. The founds are in custody of the system until the match process finishes.

## Tokens Pair

It is a pair of token where one is considered the **base token** and the other one is the **secondary token**. If an user wants to trade an X token for a Y token there must exist an X/Y token pair or a Y/X token pair. 

The secondary token is seen as the **good** and the base token is seen as the medium of **payment**. A user can create two types of orders:
- **Buy orders**: the sender is buying _secondary tokens_ in exchange for _base tokens_. 
- **Sell order**: the sender is selling _secondary tokens_ in exchange for _base tokens_.

## Orderbook

An orderbook is a data structure where the orders are saved. There are two orderbook for each tokens pair, one for **sell orders** and the other for **buy orders**. 

## Limit Orders

Limit Orders (LO from now on) are defined by an **amount** and the **price** to be paid/charged.


### Price
The price is always expresed in how much minimum units of **base token** is being paid/charged for a minimum unit of the **secondary token**. 

The price may not be the actual price in which the order matches but it is rather a limit. 
- In case of **Buy LO** the price is an upper limit of how much the user will be paying.
- In **Sell LO** the user is selling the price is an lower limit of how much will be charging.

### Amount
The amount is always the amount to be locked by the user , i.e. 
- In case of **Buy LO** is the locking amount of the base token.
- In case of **Sell LO** is the locking amount of the secondary token. 

This amount already includes the **commission charged** so the amount to be exchanged will actually be less than the locked one.

## The MoCDecentralizedExchange Contract

MoCDecentralizedExchange is the main contract of the exchange, it is the entry point of almost all the operations of the platform. In this document we will focus on _insert_ and _cancel_ orders.

To get some new tokens you should interact with the suite. The entry point is the TEX smart contract whose addresses are available on the following networks:

- mainnet: [ ADDRESS ](https://explorer.rsk.co/address/ADDRESS)
- testnet: [ 0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0 ](https://explorer.testnet.rsk.co/address/0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0)

For more information about TEX you can read [TEX architecture and smart contracts](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)


### TEX precisions

The TEX system handles different types of currency _precision_ to operate with ERC-20 tokens and RBTC. The current RSK EVM version does not "support" decimal values and it means that in TEX every value that is mathematically a decimal, it's represented as an integer adjusted by a given value, the _precision_.

Using unsigned int256 as the norm for all values, sets an upper limit to ~76 decimal places, so even if it's ok to multiply 18 precision values a couple of times, we need to be careful not to overflow nor lose precision.

## Current tokens

- A bitcoin-collateralized stable-coin, Dollar On Chain, (DoC)
- A passive income hodler-targeted token, BitPro (BPRO)
- A leveraged Bitcoin investment instrument (RIFX series).

[TODO] HABLAR DE RIF Y PONERR LAS ADDRESSES

You can find more info on the RIF token and decentralized economies [here](https://www.rifos.org/).

# Inserting an Order

In this tutorial we will show you how to insert a Buy and Sell Orders.

TEX uses ERC-20 tokens this means that you need wallets like **Nifty** and **MetaMask** to handle them if you tell them to ([MetaMask tutorial on how to do it](https://metamask.zendesk.com/hc/en-us/articles/360015489031-How-to-View-Your-Tokens), Nifty is very similar to it so you should follow that link too if you are using the latter).
​​
## Inserting a Buy Order

In this tutorial the functions that is of interest to us are two:
```js
  function insertBuyOrder( 
    address _baseToken, 
    address _secondaryToken, 
    uint256 _amount, 
    uint256 _price, 
    uint64 _lifespan) public
```
```js
 function insertBuyOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public
```
The difference is that **insertBuyOrderAfter** uses a hint to optimize the insertion. Each order has a unique ID.

### Parameters of the operation

#### The baseToken parameter
Is the address of the contract used to implement the ERC-20 base token. You can find more about 
the current supported tokens [here](#current-tokens).

#### The secondaryToken parameter

Is the address of the contract used to implement the ERC-20 secondary token. You can find more about the current supported tokens [here](#current-tokens). 

The token pair must exist in the TEX platform because it defines the precisions to use in _price_ and _amout_ parameter.

#### The amount parameter
It is the locking amount of the base token (the medium of payment).

This amount already includes the **commission charged** so the amount to be exchanged will actually be less than the locked one.

#### The price parameter

The price is always expresed in how much minimum units of **base token** is being paid for a minimum unit of the **secondary token**. The price is an upper limit of how much the user will be paying.

#### The lifespan parameter

Is the number of ticks that the order will be expired and no longer matched, must be lower or equal than the maximum (currently 10). It is a positive integer value.

#### The previousOrderIdHint parameter

It is previous order ID in the orderbook, used as on optimization to search for. It is used only in the `insertBuyOrderAfter` function. It is a positive integer value.

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by your wallet(you should read about them if you are developing and you don't know exactly what are they) but you should take them into account when trying to send all of your funds to mint some BitPros.

### Possible failures

This operation may fail if one of the following scenarios occurs:

#### The TEX contract is paused:

If the system suffers some type of attack, the contract can be paused so that operations cannot be done and the risk of the users losing their funds with the operation can be minimized. You can get more information about stoppables contracts [here](https://github.com/money-on-chain/Areopagus-Governance/blob/develop/contracts/Stopper/Stoppable.sol)
In that state, the contract doesn't allow minting any type of token.

To know if this is the case you can ask to **MoCDecentralizedExchange** if it's **paused()**.

#### You sent too low amount:

It reverts if the amount is not valid given a maximum in common base token currency and the error message will be "amount is not enough". [TODO: COMENTAR DE DONDE SE SACA ESTE MINIMO]

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### You sent too high lifespan:

If the lifespan is not valid given a maximum value then it reverts and sends the error message will be "Lifespan too high". [TODO: COMENTAR DE DONDE SE SACA ESTE LIFESPAN]

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### Not valid price:

If the price is zero, it reverts and sends the error message will be "Price cannot be zero".

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### Pair token is disabled:

The token pair can be enabled or disabled. If it is disabled, the transaction reverts with the message: "Pair has been disabled".

#### Not enough gas:

If the gas limit sent is not enough to run all the code needed to execute the transaction, the transaction will revert(again, returning all your funds except the fee paid to the network). This may return an "out of gas" error or simply a "revert" error because of the usage of the proxy pattern.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, with a console or with an app.
​
#### Smart Contract​
​
To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. In this tutorial, we will show you how to do it using [Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), [Truffle Framework](https://www.trufflesuite.com/) and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, please follow [this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) the only extra thing you need to do is to install our repo as a dependency in your NPM project. In order you need to do this you just need to run the following command.
​

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. For this let's suppose you are doing some kind of contract that when executing a certain task charges a fixed commission.
​
You just have to import the contract **MoCDecentralizedExchange** contract
​

```js
import "decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol";
```

Receive the address in the constructor in order to be able to interact with it later

```js
constructor (MoCDecentralizedExchange _texContract, rest of your params...) {
//....rest of your constructor....
}
​
```

​You must know the addresses of the tokens that you want to use

```js
address constant private docAddress = 0xE0f5206BBD039e7b0592d8918820024e2a7437b9;
address constant private rifAddress = 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE;
​```

```js

function yourInsertBuyOrder(uint256 _amount, uint256 _price, uint64 _lifespan) public {
  uint256 yourCommissions = calcYourCommission(_price);
  docAddress.transfer(yourCommisionAddress, yourCommissions);
  tex.insertBuyOrder(docAddress, rifAddress, _amount - yourCommissions, _price, _lifespan);
}
```

​You can send it immediately to you so you can start using it right away. In order to do this you should add a few more lines similar to the ones before, only that you will have to use the bpro token.
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

    function yourInsertBuyOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {     
        IERC20 base = IERC20(baseTokenAddress);
        //Calc and transfer your commissions.
        uint256 commissions = calcCommissions(_amount);
        bool success = base.transfer(commissionAddress, commissions);
        require(success, "Commission transfer failed");
        
        //Insert the new buy order at start
        tex.insertBuyOrder(
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

And that is it, the only thing left to do is to add in the [truffle migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) scripts the address to MoC and BPro when deploying YourMintingBproContract and you are done.
​​
## Inserting a Sell Order

In this tutorial the functions that is of interest to us are two:
```js
  function insertSellOrder( 
    address _baseToken, 
    address _secondaryToken, 
    uint256 _amount, 
    uint256 _price, 
    uint64 _lifespan) public
```
```js
 function insertSellOrderAfter(
    address _baseToken,
    address _secondaryToken,
    uint256 _amount,
    uint256 _price,
    uint64 _lifespan,
    uint256 _previousOrderIdHint
  ) public
```
The difference is that **insertSellOrderAfter** uses a hint to optimize the insertion. Each order has a unique ID.

### Parameters of the operation

#### The baseToken parameter
Is the address of the contract used to implement the ERC-20 base token. You can find more about 
the current supported tokens [here](#current-tokens).

#### The secondaryToken parameter

Is the address of the contract used to implement the ERC-20 secondary token. You can find more about the current supported tokens [here](#current-tokens). 

The token pair must exist in the TEX platform because it defines the precisions to use in _price_ and _amout_ parameter.

#### The amount parameter
The amount of the secondary token to be locked by the user. 

This amount already includes the **commission charged** so the amount to be exchanged will actually be less than the locked one.

#### The price parameter

The price is always expresed in how much minimum units of **base token** is being paid for a minimum unit of the **secondary token**. The price is an lower limit of how much will be charging.

#### The lifespan parameter

Is the number of ticks that the order will be expired and no longer matched, must be lower or equal than the maximum (currently 10). It is a positive integer value.

#### The previousOrderIdHint parameter

It is previous order ID in the orderbook, used as on optimization to search for. It is used only in the `insertSellOrderAfter` function. It is a positive integer value.

#### Gas limit and gas price

This two values are a parameter of the transaction, this is not used in the contract and it is usually managed by your wallet(you should read about them if you are developing and you don't know exactly what are they) but you should take them into account when trying to send all of your funds to mint some BitPros.

### Possible failures

This operation may fail if one of the following scenarios occurs:

#### The TEX contract is paused:

If the system suffers some type of attack, the contract can be paused so that operations cannot be done and the risk of the users losing their funds with the operation can be minimized. You can get more information about stoppables contracts [here](https://github.com/money-on-chain/Areopagus-Governance/blob/develop/contracts/Stopper/Stoppable.sol)
In that state, the contract doesn't allow minting any type of token.

To know if this is the case you can ask to **MoCDecentralizedExchange** if it's **paused()**.

#### You sent too low amount:

It reverts if the amount is not valid given a maximum in common base token currency and the error message will be "amount is not enough". [TODO: COMENTAR DE DONDE SE SACA ESTE MINIMO]

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### You sent too high lifespan:

If the lifespan is not valid given a maximum value then it reverts and sends the error message will be "Lifespan too high". [TODO: COMENTAR DE DONDE SE SACA ESTE LIFESPAN]

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### Not valid price:

If the price is zero, it reverts and sends the error message will be "Price cannot be zero".

If the transaction reverts, all your funds will be returned (except the fee paid to the network). 

#### Pair token is disabled:

The token pair can be enabled or disabled. If it is disabled, the transaction reverts with the message: "Pair has been disabled".

#### Not enough gas:

If the gas limit sent is not enough to run all the code needed to execute the transaction, the transaction will revert(again, returning all your funds except the fee paid to the network). This may return an "out of gas" error or simply a "revert" error because of the usage of the proxy pattern.

### How-to

In the following sections we will give some code on how this can be done through a Smart Contract or directly, with a console or with an app.
​
#### Smart Contract​
​
To create a new Smart Contract that uses the TEX platform, you can use any language and IDE you want. In this tutorial, we will show you how to do it using [Solidity language](https://solidity.readthedocs.io/en/v0.5.8/), [Truffle Framework](https://www.trufflesuite.com/) and [NPM](https://www.npmjs.com/).
Truffle framework offers some template projects that you can use to develop applications that use smart contracts. You can get more information [here](https://www.trufflesuite.com/boxes).
Assuming you already have your project up and running (if you don't, please follow [this link](https://github.com/money-on-chain/sc-moc-decentralized-exchange/blob/develop/README.md)) the only extra thing you need to do is to install our repo as a dependency in your NPM project. In order you need to do this you just need to run the following command.
​

```
npm install --save -E git+https://github.com/money-on-chain/sc-moc-decentralized-exchange.git
```

​Having done that lets you use our contract as a dependency to your contract. For this let's suppose you are doing some kind of contract that when executing a certain task charges a fixed commission.
​
You just have to import the contract **MoCDecentralizedExchange** contract
​

```js
import "decentralized-exchange-sc/contracts/MoCDecentralizedExchange.sol";
```

Receive the address in the constructor in order to be able to interact with it later

```js
constructor (MoCDecentralizedExchange _texContract, rest of your params...) {
//....rest of your constructor....
}
​
```

​You must know the addresses of the tokens that you want to use

```js
address constant private docAddress = 0xE0f5206BBD039e7b0592d8918820024e2a7437b9;
address constant private rifAddress = 0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE;
​```

```js

function yourInsertBuyOrder(uint256 _amount, uint256 _price, uint64 _lifespan) public {
  uint256 yourCommissions = calcYourCommission(_amount, _price);
  docAddress.transfer(yourCommisionAddress, yourCommissions);
  tex.insertSellOrder(docAddress, rifAddress, _amount - yourCommissions, _price, _lifespan);
}
```

​You can send it immediately to you so you can start using it right away. In order to do this you should add a few more lines similar to the ones before, only that you will have to use the bpro token.
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

    function yourInsertSellOrderFirst(uint256 _amount, uint256 _price, uint64 _lifespan) public {     
        IERC20 base = IERC20(secondaryTokenAddress);
        //Calc and transfer your commissions.
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

    function calcCommissions(uint256 _amount) public view returns (uint256) {
        return _amount.div(100);
    }
}
```

And that is it, the only thing left to do is to add in the [truffle migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) scripts the address to MoC and BPro when deploying YourMintingBproContract and you are done.

# Canceling an Order
[TODO] WRITE

# From outside the blockchain

The logic of the TEX platform is developed with smart contracts that run on the RSK blockchain. To interact with this kind of technology, we developed a dApp (decentralized application), which is a web or mobile application that invokes the functions of the smart contracts.

You can find tutorials about developing dApps in the following resources:

- [The Ultimate Ethereum Dapp Tutorial (How to Build a Full Stack Decentralized Application Step-By-Step)](https://www.dappuniversity.com/articles/the-ultimate-ethereum-dapp-tutorial)

- [ETHEREUM PET SHOP -- YOUR FIRST DAPP](https://www.trufflesuite.com/tutorials/pet-shop)

- [RSK Truffle Boxes](https://developers.rsk.co/tools/truffle/boxes/)

The web3 library is one of the most popular to invoke the functions of smart contracts and there are different projects to use them with

- [javascript](https://web3js.readthedocs.io/)
- [Python](https://web3py.readthedocs.io/en/stable/)
- [Java and Android](https://docs.web3j.io/)
- [.NET](https://nethereum.readthedocs.io/en/latest/)
- [Swift](https://web3swift.io/)

[Truffle Framework](https://www.trufflesuite.com/) offers some template projects and tools that you can use to develop applications that use smart contracts.

We use **web3.js** and **truffle** in this tutorial.

An RSK smart contract is bytecode implemented on the RSK blockchain. When a smart contract is compiled, an ABI (application binary interface) is generated and it is required so that you can specify which contract function to invoke, as well as get a guarantee that the function will return the data in the format you expect.
The ABI in JSON format must be provided to web3 to build decentralized applications.

​

## Using RSK nodes

TEX contracts are executed on the RSK blockchain whose public nodes are testnet (testing environment) and mainnet (production environment). You can use a public node or install a node in your own server.

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

The RSK node can be installed on different operating systems such as Linux, Windows and Mac. It is also possible to run them in environments running docker and in cloud service providers such as AWS, Azure and Google. For more information check the [official RSK documentation](https://developers.rsk.co/rsk/node/install/)

## Using web3

You can use the technology that suits you best for your project to integrate with the TEX platform, but you must use web3 to invoke the functions of smart contracts. You can learn how to use it with the following tutorials:

- javascript: [Intro to Web3.js · Ethereum Blockchain Developer Crash Course](https://www.dappuniversity.com/articles/web3-js-intro)
- python: [Intro to Web3.py · Ethereum For Python Developers](https://www.dappuniversity.com/articles/web3-py-intro)
- Java an Android: [web3j Getting Started](https://docs.web3j.io/getting_started/)
- .NET: [Getting Started with Nethereum](http://docs.nethereum.com/en/latest/getting-started/)
- Swift: [Web3Swift README.md](https://github.com/zeriontech/web3swift)

​

## Official TEX ABIS

In the TEX repository you can find the [official ABIs of the platform](PONER LINK A LA PLATAFORMA). You can use them to build your own decentralized applications to invoke the functions of smart contracts.

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

When a transaction is mined, smart contracts can emit events and write logs to the blockchain that the frontend can then process. Click [here](https://media.consensys.net/technical-introduction-to-events-and-logs-in-ethereum-a074d65dd61e) for more information about events.

In the following example we will show you how to find events that are emitted by TEX smart contract in **RSK Testnet** blockchain with **truffle**.


### Code example: Events
[TODO] PONER CODIGO FUENTE DE EXCHANGE Y NO DE MOC.

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

//Contract address on testnet
const mocExchangeAddress = '<contract-address>';

const execute = async () => {
  web3.eth.defaultGas = 2000000;

  /**
   * Loads an specified contract
   * @param {ContractABI} abi
   * @param {String} contractAddress
   */
  const getContract = async (abi, contractAddress) => new web3.eth.Contract(abi, contractAddress);

  // Loading MoCExchange contract to get the events emitted by this
  const mocExchange = await getContract(MocExchange.abi, mocExchangeAddress);
  if (!mocExchange) {
    throw Error('Can not find MoCExchange contract.');
  }

  // In this example we are getting BPro Mint events from MoCExchange contract
  // in the interval of blocks passed by parameter
  const getEvents = () =>
    Promise.resolve(mocExchange.getPastEvents('RiskProMint', { fromBlock: 1000, toBlock: 1010 }))
      .then(events => console.log(events))
      .catch(err => console.log('Error getting past events ', err));

  await getEvents();
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
```

See [getPastEvents](https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html?highlight=getPastEvents#events-allevents) for parameters and event structure details.

## Example code inserting orders

In the following example we will show how to insert an order in **testnet** with **truffle**.

You can find code examples into _/examples_ dir.
[TODO]: PONER SCRIPTS DE EXCHANGE

```js
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository
const MocAbi = require('../../build/contracts/MoC.json');
const MoCInrateAbi = require('../../build/contracts/MoCInrate.json');
const MoCStateAbi = require('../../build/contracts/MoCState.json');
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

//Contract addresses on testnet
const mocContractAddress = '<contract-address>';
const mocInrateAddress = '<contract-address>';
const mocStateAddress = '<contract-address>';

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

  // Loading moc contract
  const moc = await getContract(MocAbi.abi, mocContractAddress);
  if (!moc) {
    throw Error('Can not find MoC contract.');
  }

  // Loading mocInrate contract. It is necessary to compute commissions
  const mocInrate = await getContract(MoCInrateAbi.abi, mocInrateAddress);
  if (!mocInrate) {
    throw Error('Can not find MoC Inrate contract.');
  }

  // Loading mocState contract. It is necessary to compute max BPRO available to mint
  const mocState = await getContract(MoCStateAbi.abi, mocStateAddress);
  if (!mocState) {
    throw Error('Can not find MoCState contract.');
  }

  const mintBpro = async btcAmount => {
    web3.eth.getAccounts().then(console.log);
    const [from] = await web3.eth.getAccounts();
    const weiAmount = web3.utils.toWei(btcAmount, 'ether');
    // Computes commision value
    const commissionValue = new BigNumber(
      await mocInrate.methods.calcCommissionValue(weiAmount).call()
    );
    // Computes totalBtcAmount to call mintBpro
    const totalBtcAmount = toContract(commissionValue.plus(weiAmount));
    console.log(`Calling Bpro minting with account: ${from} and amount: ${weiAmount}.`);
    moc.methods
      .mintBPro(weiAmount)
      .send({ from, value: totalBtcAmount, gasPrice }, function(error, transactionHash) {
        if (error) console.log(error);
        if (transactionHash) console.log('txHash: '.concat(transactionHash));
      })
      .on('transactionHash', function(hash) {
        console.log('TxHash: '.concat(hash));
      })
      .on('receipt', function(receipt) {
        console.log(receipt);
      })
      .on('error', console.error);
  };

  // Gets max BPRO available to mint
  const maxBproAvailable = await mocState.methods.maxMintBProAvalaible().call();
  const bproPriceInRBTC = await mocState.methods.bproTecPrice().call();
  console.log('=== Max Available BPRO: '.concat(maxBproAvailable.toString()));
  console.log('=== BPRO in RBTC: '.concat(bproPriceInRBTC.toString()));
  const btcAmount = '0.00001';

  // Call mint
  await mintBpro(btcAmount);
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

[TODO] PONER SCRIPT PARA EXCHANGE
```js
const HDWalletProvider = require('truffle-hdwallet-provider');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository
const MocAbi = require('./contracts/moc/MoC.json');
const MoCInrateAbi = require('./contracts/moc/MoCInrate.json');
const MoCStateAbi = require('./contracts/moc/MoCState.json');

//Config params to TestNet
const endpoint = 'https://public-node.testnet.rsk.co';
//a mnemonic is 12 words instead of a single private key to sign the //transactions
const mnemonic = 'chase chair crew elbow uncle awful cover asset cradle pet loud puzzle';
const provider = new HDWalletProvider(mnemonic, endpoint);
const web3 = new Web3(provider);

//Contract addresses on testnet
const mocContractAddress = '<contract-address>';
const mocInrateAddress = '<contract-address>';
const mocStateAddress = '<contract-address>';
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

  // Loading moc contract
  const moc = await getContract(MocAbi.abi, mocContractAddress);
  if (!moc) {
    throw Error('Can not find MoC contract.');
  }

  // Loading mocInrate contract. It is necessary to compute commissions
  const mocInrate = await getContract(MoCInrateAbi.abi, mocInrateAddress);
  if (!mocInrate) {
    throw Error('Can not find MoC Inrate contract.');
  }

  // Loading mocState contract. It is necessary to compute max BPRO available to mint
  const mocState = await getContract(MoCStateAbi.abi, mocStateAddress);
  if (!mocState) {
    throw Error('Can not find MoCState contract.');
  }

  const mintBpro = async btcAmount => {
    web3.eth.getAccounts().then(console.log);
    const from = '0x088f4B1313D161D83B4D8A5EB90905C263ce0DbD';
    const weiAmount = web3.utils.toWei(btcAmount, 'ether');
    // Computes commision value
    const commissionValue = new BigNumber(
      await mocInrate.methods.calcCommissionValue(weiAmount).call()
    );
    // Computes totalBtcAmount to call mintBpro
    const totalBtcAmount = toContract(commissionValue.plus(weiAmount));
    console.log(`Calling Bpro minting with account: ${from} and amount: ${weiAmount}.`);
    const tx = moc.methods
      .mintBPro(weiAmount)
      .send({ from, value: totalBtcAmount, gasPrice }, function(error, transactionHash) {
        if (error) console.log(error);
        if (transactionHash) console.log('txHash: '.concat(transactionHash));
      });

    return tx;
  };

  function logEnd() {
    console.log('End Example');
  }

  // Gets max BPRO available to mint
  const maxBproAvailable = await mocState.methods.maxMintBProAvalaible().call();
  console.log('Max Available BPRO: '.concat(maxBproAvailable.toString()));
  const btcAmount = '0.00005';

  // Call mint
  await mintBpro(btcAmount, logEnd);
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
[TODO] PONER SCRIPT PARA EXCHANGE. 

**Example**
```js
const Web3 = require('web3');
//You must compile the smart contracts or use the official ABIs of the //repository
const MocAbi = require('../../build/contracts/MoC.json');
const MoCInrateAbi = require('../../build/contracts/MoCInrate.json');
const MoCStateAbi = require('../../build/contracts/MoCState.json');
const BProTokenAbi = require('../../build/contracts/BProToken.json');
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