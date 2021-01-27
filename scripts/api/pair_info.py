"""
Get info and get emergent price from TEX given a pair token

To run this script need private key, run this scripts with:

user> python ./pair_info.py

"""

import pprint

from moneyonchain.networks import NetworkManager
from moneyonchain.tex import MoCDecentralizedExchange

pp = pprint.PrettyPrinter(indent=4)

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

token_status = dex.token_pairs_status(base_token, secondary_token)
print("Token Status")
pp.pprint(token_status)

print("Last Closing Price: {0}".format(token_status['lastClosingPrice'] / 10 ** 18))
print("Market Price: {0}".format(token_status['marketPrice'] / 10 ** 18))

# finally disconnect from network
network_manager.disconnect()


"""
Token Status

{   'EMAPrice': 17480576716894192682909,
    'disabled': False,
    'emergentPrice': 0,
    'lastBuyMatchAmount': 0,
    'lastBuyMatchId': 0,
    'lastClosingPrice': 26173189500000000139391,
    'lastSellMatchId': 0,
    'lastTickBlock': 1554810,
    'marketPrice': 32080730000000000000000,
    'nextTickBlock': 1554830,
    'smoothingFactor': 16530000000000000,
    'tickNumber': 60}

Last Closing Price: 26173.1895
Market Price: 32080.73

"""