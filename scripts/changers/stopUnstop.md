# Stop/Unstop MoC

The `stop.js` script allows you to pause the MoC contract as a contingency to attacks or technical problems of the platform. When this happens, users cannot:
-mint tokens
-redeem tokens
-pay the daily interest
-pay the weekly interest of BitPro holders
-run the settlement

The `unstop.js` script allows you to return the MoC contract to normal operation.

Both scripts invoke functions of the `Stopper.sol` contract that is part of the **moc-governance** project.

## Scripts package

### Network configuration

On **script-config.json** there are general network configurations and the addresses of deployed smart contracts which need to be updated.

### Scripts overview

The following script allows to deploy the changer contracts:

- `stop.js`: It allows stopping MoC contract.
- `unstop.js`: It allows unstopping MoC contract.

On general basis, the follow this standard:

- Script `input` arguments are _hardcoded_ on each script as necessary, on a `const input = { ... }` section at the beginning and the network to update the parameters must be specified.
- The scripts is suppose to be run with no arguments
- The output will be console logged (TxHash -> confirmation -> receipt | error )

### Dependencies

- nodejs 8 or higher.
- Contracts must be compiled into `~/build/contracts`. The source code can be found in `~/contracts/changers`.

## Example

### Dependencies installation

First install node dependencies. For this you should run:

```
npm install
```

### Stopping MoC Contract

Each deployment script contains an **input** object that must be updated. For example `stop.js` contains the following input:

```
const input = {
  network: 'qaTestnet',
  contractToBePaused: '0xc77853e63b9796926Bc49ea67e046F10e034220A'
};

```

The field contractToBePaused should contain the `MoC.sol` contract address.

```
node stop.js
```

```
Pausing 0xc77853e63b9796926Bc49ea67e046F10e034220A from 0xC85A04948d1029A42CF0FDcE2F799A45AD93EA40 using 0xd51128F302755666c42e3920d72FF2FE632856a9
TxHash: 0x464ee3d07821cd6fb85d5d7c23dad65debc449827c6228259e7ea39ee21b6f7e
Tx confirmation: 1
Tx receipt: { transactionHash:
   '0x464ee3d07821cd6fb85d5d7c23dad65debc449827c6228259e7ea39ee21b6f7e',
  transactionIndex: 1,
  blockHash:
   '0x55e68f4cbcda7ec285da81e9c903dd5d322875b4b8916eb187b58438313401d1',
  blockNumber: 812182,
  cumulativeGasUsed: 93538,
  gasUsed: 36393,
  contractAddress: null,
  from: '0xd51128F302755666c42e3920d72FF2FE632856a9',
  to: '0xC85A04948d1029A42CF0FDcE2F799A45AD93EA40',
  root: '0x01',
  status: true,
  nonce: undefined,
  gas: undefined,
  events: { '0': { raw: [Object] } } }



```

### Unstopping MoC Contract

Each deployment script contains an **input** object that must be updated. For example `unstop.js` contains the following input:

```
const input = {
  network: 'qaTestnet',
  contractToBePaused: '0xc77853e63b9796926Bc49ea67e046F10e034220A'
};

```

The field contractToBePaused should contain the `MoC.sol` contract address.

```
node unstop.js
```

```
UNPausing 0xc77853e63b9796926Bc49ea67e046F10e034220A from 0xC85A04948d1029A42CF0FDcE2F799A45AD93EA40 using 0xd51128F302755666c42e3920d72FF2FE632856a9
TxHash: 0x1df29f4d48662d9441da217bb3c3bcfb9291589e6d30031246fbf6b9065f6efd
Tx confirmation: 1
Tx receipt: { transactionHash:
   '0x1df29f4d48662d9441da217bb3c3bcfb9291589e6d30031246fbf6b9065f6efd',
  transactionIndex: 1,
  blockHash:
   '0x070b1e85f68afba425c7eb9f4c01dd52a3c62b74dfc552a1f39e2bd1218b94d2',
  blockNumber: 812187,
  cumulativeGasUsed: 59651,
  gasUsed: 35626,
  contractAddress: null,
  from: '0xd51128F302755666c42e3920d72FF2FE632856a9',
  to: '0xC85A04948d1029A42CF0FDcE2F799A45AD93EA40',
  root: '0x01',
  status: true,
  nonce: undefined,
  gas: undefined,
  events: { '0': { raw: [Object] } } }
```
