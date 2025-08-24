import React, { useState } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Tab } from '@headlessui/react';
import { ethers } from 'ethers';
import WalletConnection from './components/WalletConnection';
import TransferForm from './components/TransferForm';
import TransactionHistory from './components/TransactionHistory';
import ContractInteraction from './components/ContractInteraction';

// Web3 Provider 工厂函数
function getLibrary(provider: any) {
  return new ethers.BrowserProvider(provider);
}

function App() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'logs' | 'usdt'>('transfer');
  const [recentTransactions, setRecentTransactions] = useState<string[]>([]);

  const handleTransactionSubmit = (txHash: string) => {
    setRecentTransactions(prev => [txHash, ...prev.slice(0, 4)]);
  };

  const tabs = [
    { id: 'transfer', label: '转账方式', description: '直接进行 ETH 转账并存储数据', disabled: false },
    { id: 'logs', label: '日志方式', description: '通过智能合约事件日志存储数据', disabled: false },
    { id: 'usdt', label: '发送 USDT', description: 'USDT 代币转账（开发中）', disabled: true },
  ];

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-purple-700">
        {/* 头部导航 */}
        <header className="bg-white bg-opacity-10 backdrop-blur-md border-b border-white border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">数据上链系统</h1>
                <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white text-sm font-medium">ETH 测试网络</span>
                </div>
              </div>
              <WalletConnection />
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 选项卡导航 */}
          <Tab.Group
            selectedIndex={tabs.findIndex(t => t.id === activeTab)}
            onChange={(index) => setActiveTab(tabs[index].id as any)}
          >
            <Tab.List className="mb-8 bg-white/20 backdrop-blur-md rounded-lg p-1 grid grid-cols-3 gap-1">
              {tabs.map((t) => (
                <Tab key={t.id} disabled={t.disabled} className={({ selected, disabled }) =>
                  `py-3 px-4 rounded-md text-sm font-medium transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 ${
                    selected
                      ? 'bg-white text-gray-900 shadow'
                      : disabled
                      ? 'text-white/60 cursor-not-allowed'
                      : 'text-white hover:bg-white/20'
                  }`
                }>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs mt-1 opacity-80 hidden sm:block">{t.description}</div>
                </Tab>
              ))}
            </Tab.List>

            {/* 内容区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左侧：功能区 */}
              <div className="space-y-6">
                <Tab.Panels>
                  <Tab.Panel>
                    <TransferForm onTransactionSubmit={handleTransactionSubmit} />
                  </Tab.Panel>
                  <Tab.Panel>
                    <ContractInteraction />
                  </Tab.Panel>
                  <Tab.Panel>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold mb-4">USDT 转账方式</h3>
                      <div className="text-center py-10 text-gray-500">
                        <div className="text-4xl mb-4">⏳</div>
                        <p>USDT 转账功能暂未开放</p>
                        <p className="text-sm mt-2">将在后续版本中提供</p>
                      </div>
                    </div>
                  </Tab.Panel>
                </Tab.Panels>

              {/* 最近交易 */}
              {recentTransactions.length > 0 && (
                <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">最近提交的交易</h4>
                  <div className="space-y-2">
                    {recentTransactions.map((txHash, index) => (
                      <a
                        key={txHash}
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-white text-sm font-mono bg-white bg-opacity-20 px-3 py-2 rounded hover:bg-opacity-30 transition-colors"
                      >
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              </div>

              {/* 右侧：数据展示区 */}
              <div>
                <TransactionHistory />
              </div>
            </div>
          </Tab.Group>

          {/* 底部信息卡片 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">转账方式</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 页面完成文本框</li>
                <li>• 一个转账金额</li>
                <li>• 一个收款账户</li>
                <li>• 一个数据留言</li>
              </ul>
            </div>

            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">合约</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 调用合约写日志</li>
                <li>• 1.收款方</li>
                <li>• 2.兑换ETH兑换成USDT(合约地址)</li>
                <li>• 3.金额</li>
                <li>• 4.数据留言</li>
              </ul>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">合约</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 1.收款方</li>
                <li>• 2.兑换ETH兑换成USDT(合约地址)</li>
                <li>• 3.金额</li>
                <li>• 4.数据留言</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </Web3ReactProvider>
  );
}

export default App;
