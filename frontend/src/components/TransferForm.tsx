import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { PaperAirplaneIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface TransferFormProps {
  onTransactionSubmit?: (txHash: string) => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onTransactionSubmit }) => {
  const { walletInfo, getProvider } = useWeb3();
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const validateForm = () => {
    if (!formData.recipient) {
      setError('请输入收款地址');
      return false;
    }
    if (!ethers.isAddress(formData.recipient)) {
      setError('收款地址格式不正确');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('请输入有效的转账金额');
      return false;
    }
    if (parseFloat(formData.amount) > parseFloat(walletInfo.balance)) {
      setError('余额不足');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setTxHash('');

    try {
      const provider = getProvider();
      const signer = provider.getSigner();

      // 估算 Gas 费用
      const gasPrice = await provider.getFeeData();
      const estimatedGas = await provider.estimateGas({
        to: formData.recipient,
        value: ethers.parseEther(formData.amount),
        data: formData.message ? ethers.toUtf8Bytes(formData.message) : '0x',
      });

      const gasCost = estimatedGas * (gasPrice.gasPrice || ethers.parseUnits('20', 'gwei'));
      const totalCost = ethers.parseEther(formData.amount) + gasCost;

      if (totalCost > ethers.parseEther(walletInfo.balance)) {
        setError('余额不足以支付交易费用');
        return;
      }

      // 发送交易
      const transaction = {
        to: formData.recipient,
        value: ethers.parseEther(formData.amount),
        data: formData.message ? ethers.toUtf8Bytes(formData.message) : '0x',
        gasLimit: estimatedGas,
        gasPrice: gasPrice.gasPrice,
      };

      const tx = await signer.sendTransaction(transaction);
      setTxHash(tx.hash);
      
      if (onTransactionSubmit) {
        onTransactionSubmit(tx.hash);
      }

      // 等待交易确认
      await tx.wait();
      
      // 重置表单
      setFormData({ recipient: '', amount: '', message: '' });
      
    } catch (err: any) {
      console.error('Transfer failed:', err);
      setError(err.message || '转账失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
        <PaperAirplaneIcon width={16} height={16} className="shrink-0" />
        ETH 转账
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            转账金额 (ETH) *
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <div className="mt-1 text-xs text-gray-500 text-right">
            余额: {parseFloat(walletInfo.balance).toFixed(4)} ETH
          </div>
        </div>

        {/* 数据留言 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数据留言
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder="可选的链上数据留言..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
          <div className="text-xs text-gray-500 mt-1">
            留言将作为交易数据存储在区块链上
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <ExclamationCircleIcon width={16} height={16} className="shrink-0" />
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
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              处理中...
            </>
          ) : (
            <>
              <PaperAirplaneIcon width={16} height={16} className="shrink-0" />
              发送交易
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TransferForm;
