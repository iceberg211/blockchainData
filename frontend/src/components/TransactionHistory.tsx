import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { Card, List, Alert, Typography, Tag, Button, Empty, Skeleton, Space, Tooltip } from 'antd';
import { ClockCircleOutlined, ArrowRightOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, WalletOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  data: string;
  status?: number;
}

const TransactionHistory: React.FC = () => {
  const { walletInfo } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (!walletInfo.address) return;

    setIsLoading(true);
    setError('');

    try {
      const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
      if (!apiKey || apiKey === 'YourApiKeyToken') {
        setError('Etherscan API Key 未配置，无法获取交易历史。');
        setIsLoading(false);
        return;
      }

      const apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${walletInfo.address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1' && Array.isArray(data.result)) {
        const txs: Transaction[] = data.result.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to || '',
          value: ethers.formatEther(tx.value),
          timestamp: parseInt(tx.timeStamp),
          data: tx.input || '0x',
          status: tx.txreceipt_status === '1' ? 1 : 0,
        }));
        setTransactions(txs);
      } else if (data.message === 'NOTOK' && data.result.includes('Invalid API Key')) {
        setError('无效的 Etherscan API Key，请检查配置。');
      } else {
        setTransactions([]); // No transactions found
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError('获取交易历史失败，请检查网络连接。');
    } finally {
      setIsLoading(false);
    }
  }, [walletInfo.address]);

  useEffect(() => {
    if (walletInfo.isConnected) {
      fetchTransactions();
    }
  }, [walletInfo.isConnected, fetchTransactions]);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const decodeMessage = (data: string) => {
    if (!data || data === '0x') return null;
    try {
      return ethers.toUtf8String(data);
    } catch {
      return null;
    }
  };

  if (!walletInfo.isConnected) {
    return (
      <Card style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
          <Empty
            image={<WalletOutlined style={{ fontSize: 64, color: '#ccc' }} />}
            description={<Text type="secondary">请先连接钱包查看交易历史</Text>}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={<Space><ClockCircleOutlined />交易历史</Space>}
      extra={<Button icon={<SyncOutlined />} onClick={fetchTransactions} loading={isLoading}>刷新</Button>}
    >
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={transactions}
          locale={{ emptyText: <Empty description="暂无交易记录" /> }}
          renderItem={(tx) => {
            const isOut = tx.from.toLowerCase() === walletInfo.address.toLowerCase();
            const message = decodeMessage(tx.data);
            return (
              <List.Item
                key={tx.hash}
                extra={
                  <Tooltip title="在 Etherscan 上查看">
                    <Button type="link" href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank">#{tx.hash.slice(0, 8)}</Button>
                  </Tooltip>
                }
              >
                <List.Item.Meta
                  title={
                    <Space size="middle">
                      <Tag color={isOut ? 'volcano' : 'green'}>{isOut ? '发送' : '接收'}</Tag>
                      <Text strong>{parseFloat(tx.value).toFixed(5)} ETH</Text>
                    </Space>
                  }
                  description={
                    <Space split="|">
                      <Tooltip title={dayjs(tx.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}>
                        <Text type="secondary">{dayjs(tx.timestamp * 1000).fromNow()}</Text>
                      </Tooltip>
                      {tx.status === 1 ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />}
                    </Space>
                  }
                />
                <Space align="center">
                  <Tooltip title={tx.from}><Text code>{formatAddress(tx.from)}</Text></Tooltip>
                  <ArrowRightOutlined />
                  <Tooltip title={tx.to}><Text code>{formatAddress(tx.to)}</Text></Tooltip>
                </Space>
                {message && (
                  <Card size="small" style={{ marginTop: 12, background: '#f9f9f9' }}>
                    <Space>
                      <FileTextOutlined />
                      <Text type="secondary">{message}</Text>
                    </Space>
                  </Card>
                )}
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default TransactionHistory;
