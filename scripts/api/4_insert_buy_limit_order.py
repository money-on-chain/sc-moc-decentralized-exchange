"""
Inserts an order in the buy orderbook of a given pair without a hint
the pair should not be disabled; the contract should not be paused. Takes the funds
with a transferFrom

To run this script need private key, run this scripts with:

user> export ACCOUNT_PK_SECRET=PK
user> python ./4_insert_buy_limit_order.py

Where replace with your PK, and also you need to have funds in this account

"""

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


"""
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


"""