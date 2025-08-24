import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { WalletIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const WalletConnection: React.FC = () => {
  const { walletInfo, isConnecting, error, connectWallet, disconnectWallet, switchToSepolia } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(4);
  };

  const isWrongNetwork = walletInfo.isConnected && walletInfo.chainId !== 11155111;

  const handleWalletSelect = async (walletName: 'MetaMask' | 'WalletConnect') => {
    setShowWalletModal(false);
    await connectWallet(walletName);
  };

  if (!walletInfo.isConnected) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          disabled={isConnecting}
          className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50
                     bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-sm"
        >
          <WalletIcon width={16} height={16} className="shrink-0" />
          {isConnecting ? '连接中...' : '连接钱包'}
        </button>

        {/* 钱包选择模态框 */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold">连接钱包</h3>
                <p className="text-sm text-gray-500 mt-1">选择一种方式连接以太坊钱包</p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => handleWalletSelect('MetaMask')}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
                  <div className="text-left">
                    <div className="font-medium">MetaMask</div>
                    <div className="text-xs text-gray-500">浏览器中最常用的钱包</div>
                  </div>
                </button>
                <button
                  onClick={() => handleWalletSelect('WalletConnect')}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">W</div>
                  <div className="text-left">
                    <div className="font-medium">WalletConnect</div>
                    <div className="text-xs text-gray-500">使用手机钱包扫码连接</div>
                  </div>
                </button>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >取消</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-red-600 text-sm">连接失败: {error.message}</div>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* 网络错误警告 */}
      {isWrongNetwork && (
        <div className="absolute -top-12 right-0 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <ExclamationTriangleIcon width={16} height={16} className="shrink-0" />
          <span>请切换到 Sepolia 测试网</span>
          <button
            onClick={switchToSepolia}
            className="ml-2 text-yellow-800 underline hover:no-underline"
          >
            切换
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* 网络指示器 */}
        <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${isWrongNetwork ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-white text-sm font-medium">
            {isWrongNetwork ? '错误网络' : 'Sepolia'}
          </span>
        </div>

        {/* 钱包信息 */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 backdrop-blur-sm shadow-sm"
          >
            <WalletIcon width={16} height={16} className="shrink-0" />
            <div className="text-left">
              <div className="text-sm">{formatAddress(walletInfo.address)}</div>
              <div className="text-xs opacity-80">{formatBalance(walletInfo.balance)} ETH</div>
            </div>
            <ChevronDownIcon width={16} height={16} className="shrink-0" />
          </button>

          {/* 下拉菜单 */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm text-gray-600">钱包地址</div>
                <div className="font-mono text-sm">{walletInfo.address}</div>
              </div>
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm text-gray-600">余额</div>
                <div className="font-medium">{formatBalance(walletInfo.balance)} ETH</div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(walletInfo.address);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
              >
                复制地址
              </button>
              <button
                onClick={() => {
                  window.open(`https://sepolia.etherscan.io/address/${walletInfo.address}`, '_blank');
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
              >
                在 Etherscan 查看
              </button>
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600"
              >
                断开连接
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 点击外部关闭下拉菜单 */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default WalletConnection;
