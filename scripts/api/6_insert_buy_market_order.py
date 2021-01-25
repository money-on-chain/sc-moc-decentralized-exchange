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
user> python ./6_insert_buy_market_order.py

Where replace with your PK, and also you need to have funds in this account


"""


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


"""
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

"""