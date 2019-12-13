import os
from web3 import Web3
from node_manager import NodeManager
import pprint

pp = pprint.PrettyPrinter(indent=4)

network = 'mocMainnet2'
config_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'config.json')
node_manager = NodeManager(path_to_config=config_path, network=network)
node_manager.connect_node()
print("Connecting to %s..." % network)
print("Connected: {conectado}".format(conectado=node_manager.is_connected))

path_build = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../build/contracts')

governor_address = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['governor'])

base_changers = [['0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
                  '0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8',
                  '1000000000000000000',
                  '1000000000000000000']]

token = base_changers[0]  # firstone

init_settings = dict()
init_settings['dex'] = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['dex'])
init_settings['baseTokenAddres'] = [Web3.toChecksumAddress(token[0])]
init_settings['secondaryTokenAddress'] = [Web3.toChecksumAddress(token[1])]
init_settings['initPrice'] = [int(token[2])]
init_settings['pricePrecision'] = [int(token[3])]


print("Deploying contract with this settings:")
pp.pprint(init_settings)
print("Wait...")

sc, json_content = node_manager.sc_from_json_bytecode(os.path.join(path_build, "AddTokenPairChanger.json"))
tx_hash = node_manager.fnx_constructor(sc,
                                       init_settings['dex'],
                                       init_settings['baseTokenAddres'],
                                       init_settings['secondaryTokenAddress'],
                                       init_settings['initPrice'],
                                       init_settings['pricePrecision']
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
Connecting to mocMainnet2...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db'],
    'dex': '0xAb849F900921D885eAF891B0831c72e58148F0c0',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8']}
Wait...
AttributeDict({'transactionHash': HexBytes('0x30d61af3e91939ae089d102478a9b96b6b7e77dfeb274049421fa07b6042cb0b'), 'transactionIndex': 3, 'blockHash': HexBytes('0xea13cab3ebc6a61050479bc5ffae23b58163317d3f8e57360976f6f694843164'), 'blockNumber': 1952499, 'cumulativeGasUsed': 746372, 'gasUsed': 497400, 'contractAddress': '0x19e7451887787ea4796D9EaafE3586644D403dC3', 'logs': [], 'from': '0xb1ef062c364750deecdcacbf7190ed591b7a0bfe', 'to': '0x00', 'root': '0x01', 'status': 1})
Changer Contract Address: 0x19e7451887787ea4796D9EaafE3586644D403dC3

"""