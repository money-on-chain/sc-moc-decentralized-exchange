"""
Inserts an order in the buy orderbook of a given pair without a hint
the pair should not be disabled; the contract should not be paused. Takes the funds
with a transferFrom


(100 + priceDifference) / 100 = Multiply Factor

Examples:

     1% Multiply Factor:
       (100 + 1) / 100 = 1.01
    -1% Multiply Factor:
       (100 - 1 ) / 100 = 0.99

     10% Multiply Factor:
       (100 + 10) / 100 = 1.1
    -10% Multiply Factor:
       (100 - 10 ) / 100 = 0.9

To run this script need private key, run this scripts with:

user> export ACCOUNT_PK_SECRET=PK
user> python ./7_insert_sell_market_order.py

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


"""
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

"""