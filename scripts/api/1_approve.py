"""
To run this script need private key, run this scripts with:

user> export ACCOUNT_PK_SECRET=PK
user> python ./1_approve.py

Where replace with your PK, and also you need to have funds in this account
"""

from moneyonchain.networks import NetworkManager
from moneyonchain.tokens import WRBTCToken


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

account = '0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3'  # the account you want to allow
tex_address = '0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5'  # the tex address
token_address = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # token address
amount_allow = 0.001  # the amount you want to allow

token_wrbtc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

print("Allowing ... {0}".format(amount_allow))
token_wrbtc.approve(tex_address, amount_allow)

print("Token allowed amount: {0}".format(token_wrbtc.allowance(account, tex_address)))

# finally disconnect from network
network_manager.disconnect()

"""
Allowing ... 0.001
Transaction sent: 0x89fe063af9034d5b84f3aec0721f32ca14be74d0e92d8db03b29fce4bcc4ac18
  Gas price: 0.06 gwei   Gas limit: 33641   Nonce: 1641
  WRBTC.approve confirmed - Block: 1554718   Gas used: 30583 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x89fe063af9034d5b84f3aec0721f32ca14be74d0e92d8db03b29fce4bcc4ac18
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 0
Function: WRBTC.approve
Block: 1554718
Gas Used: 30583 / 33641 (90.9%)

   Events In This Transaction
   --------------------------
   Approval
      src: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      guy: 0xA066d6e20e122deB1139FA3Ae3e96d04578c67B5
      wad: 1000000000000000
Token allowed amount: 0.001

"""