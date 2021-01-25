"""
To run this script need private key, run this scripts with:

user> export ACCOUNT_PK_SECRET=PK
user> python ./2_wrap.py

Where replace with your PK, and also you need to have funds in this account
"""

from decimal import Decimal

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

token_address = '0x09b6ca5E4496238A1F176aEa6Bb607DB96c2286E'  # token address
amount_to_wrap = Decimal(0.001)  # the amount you want to wrap

token_sc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

token_sc.deposit(amount_to_wrap)

# finally disconnect from network
network_manager.disconnect()


"""
Transaction sent: 0x7d73db07b50e8074f8d4649b6ce893ced18b07e2de3b2a715805097e39c88093
  Gas price: 0.06 gwei   Gas limit: 31075   Nonce: 1642
  WRBTC.deposit confirmed - Block: 1554733   Gas used: 28250 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x7d73db07b50e8074f8d4649b6ce893ced18b07e2de3b2a715805097e39c88093
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 1000000000000000
Function: WRBTC.deposit
Block: 1554733
Gas Used: 28250 / 31075 (90.9%)

   Events In This Transaction
   --------------------------
   Deposit
      dst: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      wad: 1000000000000000
"""