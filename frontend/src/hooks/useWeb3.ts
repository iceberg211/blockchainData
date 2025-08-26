import { useWeb3React, UnsupportedChainIdError } from "@web3-react/core";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  connectorsByName,
  NETWORK_CONFIG,
  RPC_CONFIG,
  injectedConnector,
  walletConnectConnector,
} from "../config/web3";

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
  const { activate, deactivate, active, account, library, chainId, error } =
    useWeb3React();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: "",
    balance: "0",
    chainId: 0,
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const LAST_WALLET_KEY = "lastConnectedWallet";

  // 连接钱包
  const connectWallet = async (walletName: keyof typeof connectorsByName) => {
    setIsConnecting(true);
    try {
      const connector = connectorsByName[walletName];
      // Force throwing so we can handle errors explicitly
      await activate(connector, undefined, true);
      try {
        localStorage.setItem(LAST_WALLET_KEY, walletName);
      } catch {}
    } catch (err: any) {
      // Handle unsupported network by switching to Sepolia and retrying
      if (err instanceof UnsupportedChainIdError) {
        try {
          await switchToSepolia();
          const connector = connectorsByName[walletName];
          await activate(connector, undefined, true);
          return;
        } catch (switchErr) {
          console.error("Failed to switch network and reconnect:", switchErr);
        }
      } else {
        // For other errors, activate again without throwing so error state is populated
        try {
          const connector = connectorsByName[walletName];
          await activate(connector);
        } catch (innerErr) {
          console.error("Failed to connect wallet:", innerErr);
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
      address: "",
      balance: "0",
      chainId: 0,
      isConnected: false,
    });
    try {
      localStorage.removeItem(LAST_WALLET_KEY);
    } catch {}
  };

  // 切换到 Sepolia 网络
  const switchToSepolia = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia
      });
    } catch (switchError: any) {
      // 如果网络不存在，添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [NETWORK_CONFIG[11155111]],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    }
  };

  // 获取余额
  const getBalance = async (address: string) => {
    if (!library) return "0";
    try {
      const balance = await library.getBalance(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error("Failed to get balance:", err);
      return "0";
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

  // Eager reconnect on page load/refresh
  useEffect(() => {
    const tryEager = async () => {
      const last = (() => {
        try {
          return localStorage.getItem(LAST_WALLET_KEY) as
            | keyof typeof connectorsByName
            | null;
        } catch {
          return null;
        }
      })();
      if (active || isConnecting) return;
      try {
        // Prefer last used connector
        if (
          last === "MetaMask" &&
          typeof window !== "undefined" &&
          window.ethereum
        ) {
          const accounts: string[] = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts && accounts.length > 0) {
            await activate(injectedConnector);
            return;
          }
        }
        if (last === "WalletConnect") {
          // For WC v1 connector, connectEagerly may not exist; activating will restore existing session if any
          await activate(walletConnectConnector).catch(() => {});
        }
      } catch (e) {
        // ignore eager errors
      }
    };
    tryEager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Provider event listeners: accounts/chain/disconnect
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const { ethereum } = window;

    const handleAccountsChanged = async (accs: string[]) => {
      if (!accs || accs.length === 0) {
        disconnectWallet();
      } else {
        // If we have a connected context, refresh wallet info
        if (library) {
          const bal = await getBalance(accs[0]);
          setWalletInfo((w) => ({
            ...w,
            address: accs[0],
            balance: bal,
            isConnected: true,
          }));
        }
      }
    };

    const handleChainChanged = async (_chainIdHex: string) => {
      // Re-activate injected to refresh provider and state
      try {
        await activate(injectedConnector);
      } catch (e) {
        console.warn("Re-activate on chainChanged failed:", e);
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);
    ethereum.on?.("disconnect", handleDisconnect);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
      ethereum.removeListener?.("disconnect", handleDisconnect);
    };
  }, [library]);

  // 创建 Provider
  const getProvider = () => {
    if (library) return library;

    // 备用 Provider
    const rpcUrl = RPC_CONFIG.SEPOLIA_RPC || "https://rpc.sepolia.org";
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
