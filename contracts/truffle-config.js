const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a managed Ganache instance for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    // 本地开发网络
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000000
    },

    // Sepolia 测试网
    sepolia: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC || 'test test test test test test test test test test test junk',
        `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
      ),
      network_id: 11155111,
      gas: 4000000,
      gasPrice: 10000000000, // 10 gwei
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    // Sepolia (Alchemy 备用)
    sepolia_alchemy: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC || 'test test test test test test test test test test test junk',
        `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
      ),
      network_id: 11155111,
      gas: 4000000,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    // Sepolia 公共节点 (无需API Key)
    sepolia_public: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC || 'test test test test test test test test test test test junk',
        'https://rpc.sepolia.org'
      ),
      network_id: 11155111,
      gas: 4000000,
      gasPrice: 20000000000, // 稍高的gas价格确保交易被处理
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  // 编译器配置
  compilers: {
    solc: {
      version: "0.8.21",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "paris"
      }
    }
  },

  // Mocha 测试配置
  mocha: {
    timeout: 100000
  },

  // 插件配置
  plugins: [
    'truffle-plugin-verify'
  ],

  // Etherscan API 配置（用于合约验证）
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }

  // Truffle DB is currently disabled by default; to enable it, change enabled:
  // false to enabled: true. The default storage location can also be
  // overridden by specifying the adapter settings, as shown in the commented code below.
  //
  // NOTE: It is not possible to migrate your contracts to truffle DB and you should
  // make a backup of your artifacts to a safe location before enabling this feature.
  //
  // After you backed up your artifacts you can utilize db by running migrate as follows:
  // $ truffle migrate --reset --compile-all
  //
  // db: {
  //   enabled: false,
  //   host: "127.0.0.1",
  //   adapter: {
  //     name: "indexeddb",
  //     settings: {
  //       directory: ".db"
  //     }
  //   }
  // }
};
