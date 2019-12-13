# Deployment smart contract Testnet Alpha

execute this commands

```
npm install
npm run truffle-compile
npm run truffle-migrate-testnet-alpha
```

this return

```
Starting migrations...
======================
> Network name:    'mocTestnetAlpha'
> Network id:      31
> Block gas limit: 0x67c280


1_initial_migration.js
======================

   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0x53e1751c5f01fbb9a90e9d19fa13fc52e88a54f650cd74bf835688c1b715b61a
   > Blocks: 1            Seconds: 44
   > contract address:    0x2b70aAF7047b0CA8FA6BDd100a681A4915352a3D
   > block number:        444385
   > block timestamp:     1576241068
   > account:             0xA8342cC05241E0d940E1c74043faCd931562f19a
   > balance:             0.33346267726
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

   Deploying 'MoCExchangeLib'
   --------------------------
   > transaction hash:    0xfa33f8ec1e6f54582388423e2d28d0b5783c8ddc1a453b198ca8e860c01e1bf9
   ⠴ Blocks: 0            Seconds: 0   > transaction hash:    0x983ae623a2b9b296e612154893eff3c08c6c2698e1b6c0087c0a92832bfc5de0
   ⠧ Blocks: 0            Seconds: 0   > transaction hash:    0x7580eb56d466d89decfb3aa39dabc4e54f9572cd46b7049e195d9447a626034c
   > Blocks: 1            Seconds: 60
   > contract address:    0xc04785B14c03491cEDB99b469e5F835a1E41CC12
   > block number:        444388
   > block timestamp:     1576241144
   > account:             0xA8342cC05241E0d940E1c74043faCd931562f19a
   > balance:             0.33345123688
   > gas used:            74306
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00000445836 ETH

   ⠋ Blocks: 0            Seconds: 0   > Blocks: 2            Seconds: 64
   > contract address:    0xB6374453FFFA25CF3b95a4ac7457635235FF9487
   > block number:        444388
   > block timestamp:     1576241144
   > account:             0xA8342cC05241E0d940E1c74043faCd931562f19a
   > balance:             0.33345123688
   > gas used:            74306
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00000445836 ETH

   ⠙ Blocks: 0            Seconds: 0   > Blocks: 2            Seconds: 96
   > contract address:    0x919324e9d31ADbBb72706A78E6a6d7933Df544B7
   > block number:        444389
   > block timestamp:     1576241186
   > account:             0xA8342cC05241E0d940E1c74043faCd931562f19a
   > balance:             0.3332874007
   > gas used:            2730603
   > gas price:           0.06 gwei
   > value sent:          0 ETH
   > total cost:          0.00016383618 ETH

Linking libraries into dex

   Linking
   -------
   * Contract: MoCDecentralizedExchange <--> Library: MoCExchangeLib (at address: 0x919324e9d31ADbBb72706A78E6a6d7933Df544B7)
Getting governance contracts
   ⠏ Blocks: 0            Seconds: 0Adding Fee manager
Pushing implementations (fee manager)
   ⠸ Blocks: 0            Seconds: 0Creating proxy for fee manager
   ⠴ Blocks: 0            Seconds: 00xC2dd366416a7a4A34a8c06E6f59ee853f3717DEf
Setting admin for dex
   ⠸ Blocks: 0            Seconds: 00xC2dd366416a7a4A34a8c06E6f59ee853f3717DEf
Getting commission manager
   ⠧ Blocks: 0            Seconds: 0Adding dex
Pushing implementations (dex)
   ⠼ Blocks: 0            Seconds: 0Creating proxy for dex
   ⠇ Blocks: 0            Seconds: 00x4aED476F44FbbCaf7247e85E365dDd4f21c175D2
Setting admin to dex
   ⠇ Blocks: 0            Seconds: 00x4aED476F44FbbCaf7247e85E365dDd4f21c175D2
Transferying ownership from dex to owner
   ⠙ Blocks: 0            Seconds: 0Getting contracts 0x4aED476F44FbbCaf7247e85E365dDd4f21c175D2
Getting dex contract at 0x4aED476F44FbbCaf7247e85E365dDd4f21c175D2
   ⠙ Blocks: 0            Seconds: 0Tokens pairs that should be added
[ [ '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
    '0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
    '0x840871cbb73dC94dcb11b2CEA963553Db71a95b7',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0',
    '0xA274d994F698Dd09256674960d86aBa22C086669',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xA274d994F698Dd09256674960d86aBa22C086669',
    '0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf',
    '1000000000000000000',
    '1000000000000000000' ],
  [ '0xA274d994F698Dd09256674960d86aBa22C086669',
    '0x840871cbb73dC94dcb11b2CEA963553Db71a95b7',
    '1000000000000000000',
    '1000000000000000000' ] ]
{
  "dex": "0x4aED476F44FbbCaf7247e85E365dDd4f21c175D2",
  "doc": "0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0",
  "wrbtc": "0xA274d994F698Dd09256674960d86aBa22C086669",
  "test": "0x840871cbb73dC94dcb11b2CEA963553Db71a95b7",
  "bpro": "0x4dA7997A819bb46B6758B9102234c289dD2Ad3bf",
  "proxyAdmin": "0xffb65F6E24806B7e1A988EeD1Ad07BB2654fF695",
  "upgradeDelegator": "0xCDAbFbF334A5F6BCe900D2f73470D1e6722365d8",
  "governor": "0x4eAC4518e81B3A5198aADAb998D2610B46aAA609",
  "stopper": "0x5bCdf8A2E61BD238AEe43b99962Ee8BfBda1Beca",
  "commissionManager": "0xC2dd366416a7a4A34a8c06E6f59ee853f3717DEf"
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

take a look to deployments/zos.* 