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

path_build = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../build/contracts')

dex_address = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['dex'])
dex = node_manager.load_json_contract(os.path.join(path_build, "MoCDecentralizedExchange.json"),
                                      deploy_address=dex_address)

maxOrderLifespan = dex.functions.maxOrderLifespan().call()
print("maxOrderLifespan: {maxOrderLifespan}".format(maxOrderLifespan=maxOrderLifespan))
