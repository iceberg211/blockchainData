import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  data: string;
  gasUsed?: string;
  status?: number;
}

const TransactionHistory: React.FC = () => {
  const { walletInfo, getProvider } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    if (!walletInfo.address) return;

    setIsLoading(true);
    setError('');

    try {
      const provider = getProvider();
      
      // 获取最新区块号
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 1000); // 查询最近1000个区块

      // 获取发送的交易
      const sentFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          null, // 任何事件
          ethers.zeroPadValue(walletInfo.address, 32), // from address
        ],
      };

      // 获取接收的交易
      const receivedFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          null, // 任何事件
          null,
          ethers.zeroPadValue(walletInfo.address, 32), // to address
        ],
      };

      // 使用 Etherscan API 获取交易历史（更可靠的方法）
      const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
      const apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${walletInfo.address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        const txs: Transaction[] = await Promise.all(
          data.result.map(async (tx: any) => {
            // 获取交易详情
            let receipt;
            try {
              receipt = await provider.getTransactionReceipt(tx.hash);
            } catch (err) {
              console.warn('Failed to get receipt for', tx.hash);
            }

            return {
              hash: tx.hash,
              from: tx.from,
              to: tx.to || '',
              value: ethers.formatEther(tx.value),
              timestamp: parseInt(tx.timeStamp),
              blockNumber: parseInt(tx.blockNumber),
              data: tx.input || '0x',
              gasUsed: tx.gasUsed,
              status: receipt?.status || 1,
            };
          })
        );

        setTransactions(txs);
      } else {
        // 备用方法：直接查询区块
        const txs: Transaction[] = [];
        for (let i = latestBlock; i > latestBlock - 100 && i >= 0; i--) {
          try {
            const block = await provider.getBlock(i, true);
            if (block && block.transactions) {
              for (const tx of block.transactions) {
                if (typeof tx === 'object' && (tx.from === walletInfo.address || tx.to === walletInfo.address)) {
                  txs.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to || '',
                    value: ethers.formatEther(tx.value),
                    timestamp: block.timestamp,
                    blockNumber: block.number,
                    data: tx.data,
                  });
                }
              }
            }
          } catch (err) {
            console.warn('Failed to get block', i);
          }
        }
        setTransactions(txs);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError('获取交易历史失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletInfo.isConnected) {
      fetchTransactions();
    }
  }, [walletInfo.address]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const decodeMessage = (data: string) => {
    if (!data || data === '0x') return '';
    try {
      return ethers.toUtf8String(data);
    } catch {
      return data.length > 42 ? `${data.slice(0, 42)}...` : data;
    }
  };

  if (!walletInfo.isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClockIcon width={16} height={16} className="shrink-0" />
        </h3>
        <div className="text-center text-gray-500 py-8">
          请先连接钱包查看交易历史
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClockIcon width={16} height={16} className="shrink-0" />
          交易历史
        </h3>
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无交易记录
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div key={tx.hash} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.from.toLowerCase() === walletInfo.address.toLowerCase()
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {tx.from.toLowerCase() === walletInfo.address.toLowerCase() ? '发送' : '接收'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.status === 1 ? '成功' : '失败'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">从: </span>
                      <span className="font-mono">{formatAddress(tx.from)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">到: </span>
                      <span className="font-mono">{formatAddress(tx.to)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">金额: </span>
                      <span className="font-medium">{parseFloat(tx.value).toFixed(4)} ETH</span>
                    </div>
                    <div>
                      <span className="text-gray-600">时间: </span>
                      <span>{formatDate(tx.timestamp)}</span>
                    </div>
                  </div>

                  {tx.data && tx.data !== '0x' && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                      <div className="flex items-center gap-1 text-gray-600 mb-1">
                        <DocumentTextIcon width={16} height={16} className="shrink-0" />
                        数据留言:
                      </div>
                      <div className="font-mono text-xs break-all">
                        {decodeMessage(tx.data)}
                      </div>
                    </div>
                  )}
                </div>

                <a
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-primary-600 hover:text-primary-700"
                >
                  {/* <ExternalLinkIcon className="w-4 h-4" /> */}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
