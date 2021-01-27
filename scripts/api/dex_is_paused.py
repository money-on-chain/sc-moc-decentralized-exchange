"""
Get info and get emergent price from TEX given a pair token

To run this script need private key, run this scripts with:

user> python ./pair_info.py

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

is_paused = dex.paused()
print("Is paused: {0}".format(is_paused))

# finally disconnect from network
network_manager.disconnect()


"""

"""