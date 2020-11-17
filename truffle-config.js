const HDWalletProvider = require('truffle-hdwallet-provider');

// const mnemonic = 'weird tiny help punch grow typical endorse update ivory minute topic tennis';
const mnemonic =
 process.env.MNEMONIC || 'lab direct float merit wall huge wheat loyal maple cup battle butter';

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  compilers: {
    solc: {
      version: '0.5.8',
      evmVersion: 'byzantium',
      settings: {
        optimizer: {
          enabled: true,
          runs: 100
        }
      }
    }
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff
    },
    test: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*'
    },
    coverage: {
      host: '127.0.0.1',
      port: 8555,
      network_id: '*',
      gas: 0xfffffffffff
    },
    rskTestnet: {
      host: 'https://public-node.testnet.rsk.co/',
      provider: new HDWalletProvider(mnemonic, 'https://public-node.testnet.rsk.co/'),
      network_id: '*',
      gas: 6800000,
      gasPrice: 69000000,
      skipDryRun: true,
      confirmations: 1
    },
    rskMainnet: {
      host: 'https://public-node.rsk.co/',
      provider: new HDWalletProvider(mnemonic, 'https://public-node.rsk.co/'),
      network_id: '*',
      gas: 6800000,
      gasPrice: 60000000,
      skipDryRun: true,
      confirmations: 1
    }
  },
  mocha: {
    useColors: true,
    bail: true
  },
  plugins: ['truffle-contract-size']
};
