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

governor_address = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['governor'])

init_settings = dict()
init_settings['dex'] = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['dex'])
init_settings['maxOrderLifespan'] = 120


print("Deploying contract with this settings:")
pp.pprint(init_settings)
print("Wait...")

sc, json_content = node_manager.sc_from_json_bytecode(os.path.join(path_build, "MaxOrderLifespanChanger.json"))
tx_hash = node_manager.fnx_constructor(sc,
                                       init_settings['dex'],
                                       init_settings['maxOrderLifespan']
                                       )
tx_receipt = node_manager.wait_transaction_receipt(tx_hash)
print(tx_receipt)

contract_address = tx_receipt.contractAddress

print("Changer Contract Address: {address}".format(address=contract_address))

# # Change governor
# moc_governor = node_manager.load_json_contract(os.path.join(path_build, "Governor.json"),
#                                                deploy_address=governor_address)
#
# print("Saving changes to governor...")
# tx_hash = node_manager.fnx_transaction(moc_governor, 'executeChange', contract_address)
# tx_receipt = node_manager.wait_transaction_receipt(tx_hash)
# print(tx_receipt)
#
# print("Governor changes done!")


"""
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd', 'maxOrderLifespan': 120}
Wait...
AttributeDict({'transactionHash': HexBytes('0x2470566b0dfe2b724dd773814af20584fdbcb956599768f0ae92ababd75a3620'), 'transactionIndex': 1, 'blockHash': HexBytes('0x9394defcf5a2e2c7f4d1506eb7a18aa1214724d998645419cebfb5901eb83b32'), 'blockNumber': 583907, 'cumulativeGasUsed': 259127, 'gasUsed': 203819, 'contractAddress': '0xf855103ECe271a66A8Be5B3d798449671469138a', 'logs': [], 'from': '0xa8342cc05241e0d940e1c74043facd931562f19a', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0xf855103ECe271a66A8Be5B3d798449671469138a

Process finished with exit code 0
"""