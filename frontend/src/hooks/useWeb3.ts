import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { connectorsByName, NETWORK_CONFIG, RPC_CONFIG } from '../config/web3';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  isConnected: boolean;
}

export const useWeb3 = () => {
  const { activate, deactivate, active, account, library, chainId, error } = useWeb3React();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    balance: '0',
    chainId: 0,
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // 连接钱包
  const connectWallet = async (walletName: keyof typeof connectorsByName) => {
    setIsConnecting(true);
    try {
      const connector = connectorsByName[walletName];
      // Force throwing so we can handle errors explicitly
      await activate(connector, undefined, true);
    } catch (err: any) {
      // Handle unsupported network by switching to Sepolia and retrying
      if (err instanceof UnsupportedChainIdError) {
        try {
          await switchToSepolia();
          const connector = connectorsByName[walletName];
          await activate(connector, undefined, true);
          return;
        } catch (switchErr) {
          console.error('Failed to switch network and reconnect:', switchErr);
        }
      } else {
        // For other errors, activate again without throwing so error state is populated
        try {
          const connector = connectorsByName[walletName];
          await activate(connector);
        } catch (innerErr) {
          console.error('Failed to connect wallet:', innerErr);
        }
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 断开钱包连接
  const disconnectWallet = () => {
    deactivate();
    setWalletInfo({
      address: '',
      balance: '0',
      chainId: 0,
      isConnected: false,
    });
  };

  // 切换到 Sepolia 网络
  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia
      });
    } catch (switchError: any) {
      // 如果网络不存在，添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG[11155111]],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  // 获取余额
  const getBalance = async (address: string) => {
    if (!library) return '0';
    try {
      const balance = await library.getBalance(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Failed to get balance:', err);
      return '0';
    }
  };

  // 更新钱包信息
  useEffect(() => {
    const updateWalletInfo = async () => {
      if (active && account && chainId) {
        const balance = await getBalance(account);
        setWalletInfo({
          address: account,
          balance,
          chainId,
          isConnected: true,
        });
      }
    };

    updateWalletInfo();
  }, [active, account, chainId, library]);

  // 创建 Provider
  const getProvider = () => {
    if (library) return library;

    // 备用 Provider
    const rpcUrl = RPC_CONFIG.SEPOLIA_RPC || 'https://rpc.sepolia.org';
    return new ethers.JsonRpcProvider(rpcUrl);
  };

  return {
    walletInfo,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    getProvider,
    library,
  };
};
