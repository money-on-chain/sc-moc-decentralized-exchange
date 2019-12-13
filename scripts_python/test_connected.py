import os
from web3 import Web3
from node_manager import NodeManager
import pprint

pp = pprint.PrettyPrinter(indent=4)

network = 'mocTestnet'
config_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'config.json')
node_manager = NodeManager(path_to_config=config_path, network=network)
node_manager.connect_node()
print("Connecting to %s..." % network)
print("Connected: {conectado}".format(conectado=node_manager.is_connected))
print("Gas price: {gas_price}".format(gas_price=node_manager.gas_price))
#print("Minimum gas price: {gas_price}".format(gas_price=Web3.toInt(hexstr=node_manager.minimum_gas_price)))
print("Minimum gas price: {gas_price}".format(gas_price=node_manager.minimum_gas_price))
