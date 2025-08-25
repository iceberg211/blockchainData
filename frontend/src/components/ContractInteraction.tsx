import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { DocumentTextIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Form, Input, InputNumber, Button, Alert, Tooltip, Spin, Empty } from 'antd';
import { useQuery } from '@apollo/client';
import { CONTRACT_ADDRESSES } from '../config/web3';
import DataStorageABI from '../config/abi/DataStorage.abi.json';
import { GET_DATA_RECORDS } from '../graphql/queries';

// 从配置文件中读取合约地址和 ABI
const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DATA_STORAGE;
const CONTRACT_ABI = DataStorageABI;

interface SubgraphRecord {
  id: string;
  recordId: string;
  sender: string;
  recipient: string;
  amount: string;
  message: string;
  timestamp: string;
  transactionHash: string;
}

const ContractInteraction: React.FC = () => {
  const { walletInfo, getProvider } = useWeb3();
  const [form] = Form.useForm();
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txHash, setTxHash] = useState('');

  // 使用Apollo useQuery从子图获取数据
  const { loading: isQueryLoading, error: queryError, data, refetch } = useQuery(GET_DATA_RECORDS, {
    pollInterval: 15000, // 每15秒轮询一次新数据
  });

  const getSignedContract = () => {
    const provider = getProvider();
    const signer = provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  // 检查合约是否已部署
  const isContractDeployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const handleFinish = async (values: { recipient: string; amount?: number; message: string }) => {
    if (!isContractDeployed) {
      setTxError('智能合约尚未部署');
      return;
    }

    setIsTxLoading(true);
    setTxError('');
    setTxHash('');

    try {
      const contract = getSignedContract();
      const valueWei = values.amount ? ethers.parseEther(String(values.amount)) : 0n;

      const tx = await contract.storeData(values.recipient, values.message, { value: valueWei });
      setTxHash(tx.hash);
      await tx.wait();

      // 交易成功后，刷新GraphQL查询
      await refetch();
      form.resetFields();
    } catch (err: any) {
      console.error('Contract interaction failed:', err);
      setTxError(err.message || '合约调用失败');
    } finally {
      setIsTxLoading(false);
    }
  };

  if (!isContractDeployed) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DocumentTextIcon width={20} height={20} />
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
          <DocumentTextIcon width={20} height={20} />
          通过合约记录数据
        </h3>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          将您的数据作为事件日志永久记录在区块链上。此操作会产生Gas费。
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          disabled={isTxLoading}
          className="space-y-4"
        >
          <Form.Item
            label="数据消息"
            name="message"
            rules={[{ required: true, message: '请输入需要上链的数据' }]}
          >
            <Input.TextArea rows={3} placeholder="例如：订单号、证书哈希、或其他需要永久记录的文本..." />
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-1">
                关联地址
                <Tooltip title="此数据记录将与这个地址关联，同时也是可选ETH的接收方。">
                  <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
                </Tooltip>
              </span>
            }
            name="recipient"
            rules={[
              { required: true, message: '请输入一个关联地址' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    const ok = ethers.isAddress(value);
                    return ok ? Promise.resolve() : Promise.reject(new Error('地址格式无效'));
                  } catch {
                    return Promise.reject(new Error('地址格式无效'));
                  }
                },
              },
            ]}
          >
            <Input placeholder="0x... (例如，一个用户的钱包地址)" allowClear />
          </Form.Item>

          <Form.Item
            label="附加ETH (可选)"
            name="amount"
            rules={[{ type: 'number', min: 0, message: '请输入不小于 0 的金额' }]}
          >
            <InputNumber placeholder="0.0" step={0.0001} min={0} style={{ width: '100%' }} />
          </Form.Item>

          {txError && (
            <Alert message={txError} type="error" showIcon />
          )}

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

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isTxLoading}
              disabled={!walletInfo.isConnected}
              icon={<DocumentTextIcon width={16} height={16} />}
              className="w-full"
            >
              记录上链
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* 合约记录 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClockIcon width={20} height={20} />
          合约记录 (总计: {data?.dataRecords?.length || 0})
        </h4>

        {isQueryLoading && (
          <div className="text-center py-8">
            <Spin size="large" />
            <p className="mt-2 text-gray-500">正在从子图加载数据...</p>
          </div>
        )}

        {queryError && (
          <Alert
            message="数据加载失败"
            description={queryError.message}
            type="error"
            showIcon
          />
        )}

        {!isQueryLoading && !queryError && data?.dataRecords.length === 0 && (
          <Empty description="暂无合约记录，快去提交第一条吧！" />
        )}

        {!isQueryLoading && !queryError && data?.dataRecords.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.dataRecords.map((record: SubgraphRecord) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        记录 #{record.recordId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(Number(record.timestamp) * 1000).toLocaleString('zh-CN')}
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

                    {Number(ethers.formatEther(record.amount)) > 0 && (
                      <div className="text-sm mb-2">
                        <span className="text-gray-600">金额: </span>
                        <span className="font-medium">{Number(ethers.formatEther(record.amount)).toFixed(4)} ETH</span>
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
