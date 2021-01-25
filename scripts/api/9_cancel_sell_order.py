"""

cancels the sell _orderId order.
the contract must not be paused; the caller should be the order owner
_baseToken Base Token involved in the canceled Order pair
_secondaryToken Secondary Token involved in the canceled Order pair
_orderId Order id to cancel
_previousOrderIdHint previous order in the orderbook, used as on optimization to search for.

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
order_id = 161
previous_order_id = 0

print("Order cancel. Please wait to the transaction be mined!...")
tx_receipt = dex.cancel_sell_order(
    base_token,
    secondary_token,
    order_id,
    previous_order_id)

# finally disconnect from network
network_manager.disconnect()


"""
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

"""