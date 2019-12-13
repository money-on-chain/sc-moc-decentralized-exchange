# Deployment smart contract Mainnet

```
curl https://rsk-mainnet01.moneyonchain.com/ -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```



execute this commands

```
npm install
npm run truffle-compile
npm run truffle-migrate-mainnet
```

this return

```
Starting migrations...
======================
> Network name:    'mocMainnet'
> Network id:      30
> Block gas limit: 0x67c280


1_initial_migration.js
======================

   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0xc9e8569fd8b47c929214f52c7f4ea18de34a7332c362b4a9f6b307a9f7655208
   > Blocks: 1            Seconds: 33
   > contract address:    0x0F2951894513262875AA976E3BF176915d8F368c
   > block number:        1952346
   > block timestamp:     1576265981
   > account:             0xB1ef062C364750DeECdCaCBf7190ed591B7a0Bfe
   > balance:             0.00497716412
   > gas used:            190299
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00001141794 ETH


   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:       0.00001141794 ETH


2_deploy_contracts.js
=====================
Deploying fakes? false
Deploying Tokens and libraries

   Deploying 'SafeTransfer'
   ------------------------

   Deploying 'TickState'
   ---------------------
   > transaction hash:    0x147270948a8ce1a05e66e4157ebed1d8cb532e4fac265dc3b77663077b2689e4
   ⠋ Blocks: 0            Seconds: 0
   Deploying 'MoCExchangeLib'
   --------------------------
   ⠸ Blocks: 0            Seconds: 0   > transaction hash:    0x8ffa2be3eab05e17c230984179dacec7ccbad07de0a1164e63493ade75280ca1
   ⠙ Blocks: 0            Seconds: 0   > transaction hash:    0xa37272172c8b16b823df405405345e4a8754ffc2106c14ee69341b4742740eac
   > Blocks: 2            Seconds: 97
   > contract address:    0xdE1c5EF2DC5eFf383eE4DaeBb4352324a31999C2
   > block number:        1952350
   > block timestamp:     1576266132
   > account:             0xB1ef062C364750DeECdCaCBf7190ed591B7a0Bfe
   > balance:             0.0049701821
   > gas used:            74306
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00000445836 ETH

   ⠸ Blocks: 0            Seconds: 0   > Blocks: 3            Seconds: 141
   > contract address:    0xE09b5C540a2f45f2C340d69aBc105E2Fd0F1CD43
   > block number:        1952351
   > block timestamp:     1576266174
   > account:             0xB1ef062C364750DeECdCaCBf7190ed591B7a0Bfe
   > balance:             0.00480188756
   > gas used:            74306
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00000445836 ETH

   ⠇ Blocks: 0            Seconds: 0   > Blocks: 3            Seconds: 141
   > contract address:    0x074e577d3Fb34a16482378D28B488D99910A4dcb
   > block number:        1952351
   > block timestamp:     1576266174
   > account:             0xB1ef062C364750DeECdCaCBf7190ed591B7a0Bfe
   > balance:             0.00480188756
   > gas used:            2730603
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00016383618 ETH

Linking libraries into dex

   Linking
   -------
   * Contract: MoCDecentralizedExchange <--> Library: MoCExchangeLib (at address: 0x074e577d3Fb34a16482378D28B488D99910A4dcb)
Getting governance contracts
   ⠸ Blocks: 0            Seconds: 0Adding Fee manager
Pushing implementations (fee manager)
   ⠧ Blocks: 0            Seconds: 0Creating proxy for fee manager
   ⠸ Blocks: 0            Seconds: 00x4ac95aF42Be3Cea9cc7e3cD7C7fEBf010f058761
Setting admin for dex
   ⠏ Blocks: 0            Seconds: 00x4ac95aF42Be3Cea9cc7e3cD7C7fEBf010f058761
Getting commission manager
   ⠙ Blocks: 0            Seconds: 0Adding dex
Pushing implementations (dex)
   ⠇ Blocks: 0            Seconds: 0Creating proxy for dex
   ⠦ Blocks: 0            Seconds: 00xAb849F900921D885eAF891B0831c72e58148F0c0
Setting admin to dex
   ⠴ Blocks: 0            Seconds: 00xAb849F900921D885eAF891B0831c72e58148F0c0
Transferying ownership from dex to owner
   ⠋ Blocks: 0            Seconds: 0Getting contracts 0xAb849F900921D885eAF891B0831c72e58148F0c0
Getting dex contract at 0xAb849F900921D885eAF891B0831c72e58148F0c0
   ⠹ Blocks: 0            Seconds: 0Tokens pairs that should be added
[ [ '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
    '0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
    '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
    '0xA274d994F698Dd09256674960d86aBa22C086669',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xA274d994F698Dd09256674960d86aBa22C086669',
    '0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xA274d994F698Dd09256674960d86aBa22C086669',
    '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
    '1000000000000000000',
    '1000000000000000000' ] ]
{
  "dex": "0xAb849F900921D885eAF891B0831c72e58148F0c0",
  "doc": "0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db",
  "wrbtc": "0xA274d994F698Dd09256674960d86aBa22C086669",
  "test": "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
  "bpro": "0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8",
  "proxyAdmin": "0x009C51E1f6feDcDB8014Ea9AE1E39B6dbF2AC0EC",
  "upgradeDelegator": "0x5cE577f6Ec969CE9a282838D350206C52A6F338C",
  "governor": "0xC61F0392d5170214b5D93C0BC4c4354163aBC1f7",
  "stopper": "0x40662eD57284B4B541A42D347BE2447ABd1b119d",
  "commissionManager": "0x4ac95aF42Be3Cea9cc7e3cD7C7fEBf010f058761"
}

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:        0.0001727529 ETH


Summary
=======
> Total deployments:   4
> Final cost:          0.00018417084 ETH

```