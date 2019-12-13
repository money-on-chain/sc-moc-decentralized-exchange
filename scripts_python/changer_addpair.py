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
1.
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'],
    'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf']}
Wait...
AttributeDict({'transactionHash': HexBytes('0xaae642dffc6392d997c06c26a05c73947da90260f1ddb59bed602594029c9546'), 'transactionIndex': 1, 'blockHash': HexBytes('0x7cbf8d007b17756d41afad580076eda14a7d3adf8a69b6faed5f25ea173fc54a'), 'blockNumber': 409365, 'cumulativeGasUsed': 549952, 'gasUsed': 497528, 'contractAddress': '0x5Eed4b91d835595A6589EF2C7a8ad73f4D1bF46b', 'logs': [], 'from': '0xe2929d888015eb568affa06aab946923a7236ad9', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0x5Eed4b91d835595A6589EF2C7a8ad73f4D1bF46b

2.
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'],
    'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE']}
Wait...
AttributeDict({'transactionHash': HexBytes('0xbdf815d0e73436831fc8f2c864aa1a7497646546f45ee45725eddbd2f7562ae0'), 'transactionIndex': 0, 'blockHash': HexBytes('0x188cab9b135ba3ce3921f8b67e4be4463ea9d1184eaf8dd8cb30b29b79dc9acb'), 'blockNumber': 409385, 'cumulativeGasUsed': 497528, 'gasUsed': 497528, 'contractAddress': '0x9F1533465932bc8Eb4DB50990C0fC4AAc9D60aE7', 'logs': [], 'from': '0xe2929d888015eb568affa06aab946923a7236ad9', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0x9F1533465932bc8Eb4DB50990C0fC4AAc9D60aE7

3.
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0'],
    'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0xA274d994F698Dd09256674960d86aBa22C086669']}
Wait...
AttributeDict({'transactionHash': HexBytes('0xf36f47be8233ccfce35ed5e2b6e221935d6c4608f8315eb8f23b45af2c0f90d3'), 'transactionIndex': 0, 'blockHash': HexBytes('0x0ecf41a42e99b965b6cb7a20a23675070c19fd4bafe4ef668ad9a92f5d768fde'), 'blockNumber': 409395, 'cumulativeGasUsed': 497528, 'gasUsed': 497528, 'contractAddress': '0xBBE6C790580F83848beB27B15A00338561779c77', 'logs': [], 'from': '0xe2929d888015eb568affa06aab946923a7236ad9', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0xBBE6C790580F83848beB27B15A00338561779c77


4.
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xA274d994F698Dd09256674960d86aBa22C086669'],
    'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf']}
Wait...
AttributeDict({'transactionHash': HexBytes('0x9b6b0ef7bbd344fa3c3dc1b596237fcfa65b8b3942dce787ef370ab55b1b4576'), 'transactionIndex': 0, 'blockHash': HexBytes('0x7a9d67faccf2599f42e2db87692224c4d060a4510671c2e98595552301393a3b'), 'blockNumber': 409413, 'cumulativeGasUsed': 497528, 'gasUsed': 497528, 'contractAddress': '0x0bCCbf6C29EABff174435A106afb757CC3051Aca', 'logs': [], 'from': '0xe2929d888015eb568affa06aab946923a7236ad9', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0x0bCCbf6C29EABff174435A106afb757CC3051Aca

5.
Connecting to mocTestnet...
Connected: True
Deploying contract with this settings:
{   'baseTokenAddres': ['0xA274d994F698Dd09256674960d86aBa22C086669'],
    'dex': '0x7bA66cB9b83b605D1ADbE60feA29B633aB3b29fd',
    'initPrice': [1000000000000000000],
    'pricePrecision': [1000000000000000000],
    'secondaryTokenAddress': ['0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE']}
Wait...
AttributeDict({'transactionHash': HexBytes('0x4e7aebc327a2e2144e9914f54923017f238bfaf973ebf8b5b64aa0b3018cb223'), 'transactionIndex': 1, 'blockHash': HexBytes('0xc21cfd5eb03370a9b2c82ceb37819463c6934102a7be3947f2a147e5821c56f3'), 'blockNumber': 409418, 'cumulativeGasUsed': 549685, 'gasUsed': 497528, 'contractAddress': '0x5be3A65b71901b961920bA2EE3fe05394A77fc19', 'logs': [], 'from': '0xe2929d888015eb568affa06aab946923a7236ad9', 'to': None, 'root': '0x01', 'status': 1, 'logsBloom': HexBytes('0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')})
Changer Contract Address: 0x5be3A65b71901b961920bA2EE3fe05394A77fc19

"""