"""
To run this script need private key, run this scripts with:

user> export ACCOUNT_PK_SECRET=PK
user> python ./3_unwrap.py

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
amount_to_unwrap = Decimal(0.001)  # the amount you want to wrap

token_sc = WRBTCToken(network_manager, contract_address=token_address).from_abi()

token_sc.withdraw(amount_to_unwrap)

# finally disconnect from network
network_manager.disconnect()


"""
Transaction sent: 0x0ae35f61b709b4f40f83d4472b2b799c5498c43bb9619d1fe2b53e331f800c2a
  Gas price: 0.06 gwei   Gas limit: 42890   Nonce: 1643
  WRBTC.withdraw confirmed - Block: 1554744   Gas used: 38991 (90.91%)

Transaction was Mined 
---------------------
Tx Hash: 0x0ae35f61b709b4f40f83d4472b2b799c5498c43bb9619d1fe2b53e331f800c2a
From: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
To: 0x09B6Ca5E4496238a1F176aEA6bB607db96C2286E
Value: 0
Function: WRBTC.withdraw
Block: 1554744
Gas Used: 38991 / 42890 (90.9%)

   Events In This Transaction
   --------------------------
   Withdrawal
      src: 0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
      wad: 1000000000000000

"""