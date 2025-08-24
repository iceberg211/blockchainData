import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';

// 支持的链 ID
export const SUPPORTED_CHAIN_IDS = [11155111]; // Sepolia testnet

// 网络配置
export const NETWORK_CONFIG = {
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'SEP',
      decimals: 18,
    },
    rpcUrls: [
      'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      'https://rpc.sepolia.org',
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
};

// Infura 和 Alchemy 配置
export const RPC_CONFIG = {
  INFURA_KEY: import.meta.env.VITE_INFURA_KEY || '',
  ALCHEMY_KEY: import.meta.env.VITE_ALCHEMY_KEY || '',
  SEPOLIA_RPC: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`,
  SEPOLIA_ALCHEMY: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`,
};

// 钱包连接器
export const injectedConnector = new InjectedConnector({
  supportedChainIds: SUPPORTED_CHAIN_IDS,
});

export const walletConnectConnector = new WalletConnectConnector({
  rpc: {
    11155111: RPC_CONFIG.SEPOLIA_RPC,
  },
  chainId: 11155111,
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
});

// 连接器映射
export const connectorsByName = {
  MetaMask: injectedConnector,
  WalletConnect: walletConnectConnector,
};

// 常用合约地址
export const CONTRACT_ADDRESSES = {
  // 将在部署后更新
  DATA_STORAGE: '',
  USDT_SEPOLIA: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // USDT on Sepolia
};
