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
  const { walletInfo, getProvider } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [missingKey, setMissingKey] = useState(false);
  const [usingLocalRecent, setUsingLocalRecent] = useState(false);

  const fetchFromLocalRecent = useCallback(async () => {
    // 使用本地最近交易哈希 + RPC 查询详情（通过 Infura 等 Provider）
    setUsingLocalRecent(true);
    try {
      const raw = localStorage.getItem('recentTxs');
      const hashes: string[] = raw ? JSON.parse(raw) : [];
      if (!hashes || hashes.length === 0) {
        setTransactions([]);
        return;
      }
      const provider = getProvider();
      const results = await Promise.all(
        hashes.slice(0, 20).map(async (h) => {
          try {
            const tx = await provider.getTransaction(h);
            if (!tx) return null;
            let timestamp = 0;
            let status: number | undefined = undefined;
            if (tx.blockNumber) {
              const [block, receipt] = await Promise.all([
                provider.getBlock(tx.blockNumber),
                provider.getTransactionReceipt(h).catch(() => undefined),
              ]);
              timestamp = Number(block?.timestamp ?? 0) * 1000; // ms
              if (receipt && typeof receipt.status === 'number') {
                status = receipt.status;
              }
            }
            const valueEth = tx.value ? ethers.formatEther(tx.value) : '0';
            return {
              hash: h,
              from: tx.from || walletInfo.address,
              to: tx.to || '',
              value: valueEth,
              timestamp: Math.floor(timestamp / 1000),
              data: (tx as any).data || '0x',
              status,
            } as Transaction;
          } catch {
            return null;
          }
        })
      );
      const list = results.filter(Boolean) as Transaction[];
      setTransactions(list);
      setError('');
    } catch (e) {
      setTransactions([]);
      setError('无法从本地记录获取交易详情');
    }
  }, [getProvider, walletInfo.address]);

  const fetchTransactions = useCallback(async () => {
    if (!walletInfo.address) return;

    setIsLoading(true);
    setError('');

    try {
      const apiKey =
        (import.meta.env as any).VITE_ETHERSCAN_API_KEY ||
        (import.meta.env as any).VITE_ETHERSCAN_KEY ||
        '';
      if (!apiKey || String(apiKey).toLowerCase() === 'yourapikeytoken') {
        setMissingKey(true);
        await fetchFromLocalRecent();
        setIsLoading(false);
        return;
      } else {
        setMissingKey(false);
      }

      const apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${walletInfo.address}&startblock=100000&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;
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
      } else if (data.message === 'NOTOK' && data.result?.includes?.('Invalid API Key')) {
        setError('无效的 Etherscan API Key，已回退为本地最近记录。');
        await fetchFromLocalRecent();
      } else {
        setTransactions([]); // No transactions found
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError('获取交易历史失败，已回退为本地最近记录。');
      await fetchFromLocalRecent();
    } finally {
      setIsLoading(false);
    }
  }, [walletInfo.address, fetchFromLocalRecent]);

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
      {missingKey && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="未配置 Etherscan API Key"
          description={
            <span>
              交易历史依赖 Etherscan API。请在前端环境变量中设置 <code>VITE_ETHERSCAN_API_KEY</code>（或 <code>VITE_ETHERSCAN_KEY</code>），然后重启开发服务。
            </span>
          }
        />
      )}

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
