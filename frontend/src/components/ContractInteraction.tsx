import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { DocumentTextIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

// 智能合约 ABI（简化版）
const CONTRACT_ABI = [
  "function storeData(address _recipient, string memory _message) external payable",
  "function getRecord(uint256 _recordId) external view returns (tuple(uint256 id, address sender, address recipient, uint256 amount, string message, uint256 timestamp, bytes32 dataHash))",
  "function getUserRecords(address _user) external view returns (uint256[])",
  "function getTotalRecords() external view returns (uint256)",
  "event DataStored(uint256 indexed recordId, address indexed sender, address indexed recipient, uint256 amount, string message, bytes32 dataHash, uint256 timestamp)"
];

// 临时合约地址（部署后需要更新）
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // 待部署后更新

interface ContractRecord {
  id: number;
  sender: string;
  recipient: string;
  amount: string;
  message: string;
  timestamp: number;
  dataHash: string;
}

const ContractInteraction: React.FC = () => {
  const { walletInfo, getProvider } = useWeb3();
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [records, setRecords] = useState<ContractRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const getContract = () => {
    const provider = getProvider();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const getSignedContract = () => {
    const provider = getProvider();
    const signer = provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  // 检查合约是否已部署
  const isContractDeployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

  // 获取合约记录
  const fetchRecords = async () => {
    if (!isContractDeployed || !walletInfo.isConnected) return;

    try {
      const contract = getContract();
      const total = await contract.getTotalRecords();
      setTotalRecords(total.toNumber());

      if (total.toNumber() > 0) {
        const userRecordIds = await contract.getUserRecords(walletInfo.address);
        const recordPromises = userRecordIds.map(async (id: any) => {
          const record = await contract.getRecord(id);
          return {
            id: record.id.toNumber(),
            sender: record.sender,
            recipient: record.recipient,
            amount: ethers.formatEther(record.amount),
            message: record.message,
            timestamp: record.timestamp.toNumber(),
            dataHash: record.dataHash,
          };
        });

        const userRecords = await Promise.all(recordPromises);
        setRecords(userRecords);
      }
    } catch (err: any) {
      console.error('Failed to fetch records:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [walletInfo.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContractDeployed) {
      setError('智能合约尚未部署');
      return;
    }

    if (!formData.recipient || !ethers.isAddress(formData.recipient)) {
      setError('请输入有效的收款地址');
      return;
    }

    if (!formData.message.trim()) {
      setError('请输入数据消息');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');

    try {
      const contract = getSignedContract();
      const amount = formData.amount ? ethers.parseEther(formData.amount) : 0;

      const tx = await contract.storeData(formData.recipient, formData.message, {
        value: amount,
      });

      setTxHash(tx.hash);
      await tx.wait();

      // 重新获取记录
      await fetchRecords();
      
      // 重置表单
      setFormData({ recipient: '', amount: '', message: '' });
      
    } catch (err: any) {
      console.error('Contract interaction failed:', err);
      setError(err.message || '合约调用失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (!isContractDeployed) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DocumentTextIcon width={18} height={18} />
          智能合约日志方式
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-gray-600 mb-2">智能合约尚未部署</p>
          <p className="text-sm text-gray-500">
            请先部署 DataStorage 合约到 Sepolia 测试网
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-medium mb-2">部署步骤：</p>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. 配置环境变量（助记词、API Keys）</li>
              <li>2. 运行：npx truffle migrate --network sepolia</li>
              <li>3. 更新前端合约地址配置</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 合约交互表单 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DocumentTextIcon width={18} height={18} />
          智能合约数据存储
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 收款地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              收款地址 *
            </label>
            <input
              type="text"
              value={formData.recipient}
              onChange={(e) => handleInputChange('recipient', e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* 转账金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              转账金额 (ETH)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.0 (可选)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* 数据消息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据消息 *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="要存储到区块链的数据消息..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <ExclamationCircleIcon className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 交易哈希 */}
          {txHash && (
            <div className="bg-green-50 p-3 rounded-md">
              <div className="text-sm text-green-800">
                交易已提交: 
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline hover:no-underline font-mono"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading || !walletInfo.isConnected}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                处理中...
              </>
            ) : (
              <>
                <DocumentTextIcon width={18} height={18} />
                存储到合约
              </>
            )}
          </button>
        </form>
      </div>

      {/* 合约记录 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          合约记录 (总计: {totalRecords})
        </h4>

        {records.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无合约记录
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {records.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        记录 #{record.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(record.timestamp * 1000).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <span className="text-gray-600">发送方: </span>
                        <span className="font-mono">{record.sender.slice(0, 10)}...</span>
                      </div>
                      <div>
                        <span className="text-gray-600">接收方: </span>
                        <span className="font-mono">{record.recipient.slice(0, 10)}...</span>
                      </div>
                    </div>

                    {parseFloat(record.amount) > 0 && (
                      <div className="text-sm mb-2">
                        <span className="text-gray-600">金额: </span>
                        <span className="font-medium">{parseFloat(record.amount).toFixed(4)} ETH</span>
                      </div>
                    )}

                    <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                      <div className="text-gray-600 mb-1">数据消息:</div>
                      <div className="break-all">{record.message}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractInteraction;
