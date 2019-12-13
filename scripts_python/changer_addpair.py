import os
from web3 import Web3
from node_manager import NodeManager
import pprint

pp = pprint.PrettyPrinter(indent=4)

network = 'mocTestnetAlpha'
config_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'config.json')
node_manager = NodeManager(path_to_config=config_path, network=network)
node_manager.connect_node()
print("Connecting to %s..." % network)
print("Connected: {conectado}".format(conectado=node_manager.is_connected))

path_build = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../build/contracts')

governor_address = Web3.toChecksumAddress(node_manager.options['networks'][network]['addresses']['governor'])

base_changers = [['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
                  '0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf',
                  '1000000000000000000',
                  '1000000000000000000'],
                 ['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
                  '0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE',
                  '1000000000000000000',
                  '1000000000000000000'],
                 ['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
                  '0xA274d994F698Dd09256674960d86aBa22C086669',
                  '1000000000000000000',
                  '1000000000000000000'],
                 ['0xA274d994F698Dd09256674960d86aBa22C086669',
                  '0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf',
                  '1000000000000000000',
                  '1000000000000000000'],
                 ['0xA274d994F698Dd09256674960d86aBa22C086669',
                  '0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE',
                  '1000000000000000000',
                  '1000000000000000000']]

token = base_changers[4]  # firstone

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

"""