import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { Button, Dropdown, Card, Space, Typography, Badge, Modal, Alert, Tooltip, message } from 'antd';
import type { MenuProps } from 'antd';
import { WalletOutlined, DownOutlined, CopyOutlined, LinkOutlined, DisconnectOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

const WalletConnection: React.FC = () => {
  const { walletInfo, isConnecting, error, connectWallet, disconnectWallet, switchToSepolia } = useWeb3();
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

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletInfo.address);
    message.success('地址已复制到剪贴板');
  };

  const handleViewOnEtherscan = () => {
    window.open(`https://sepolia.etherscan.io/address/${walletInfo.address}`, '_blank');
  };

  if (!walletInfo.isConnected) {
    return (
      <>
        <Button
          type="primary"
          size="large"
          icon={<WalletOutlined />}
          loading={isConnecting}
          onClick={() => setShowWalletModal(true)}
          style={{ height: 48, borderRadius: 12, fontWeight: 600 }}
        >
          {isConnecting ? '连接中...' : '连接钱包'}
        </Button>

        <Modal
          title="连接钱包"
          open={showWalletModal}
          onCancel={() => setShowWalletModal(false)}
          footer={null}
          centered
          width={400}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card hoverable onClick={() => handleWalletSelect('MetaMask')} style={{ cursor: 'pointer' }}>
              <Space>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #f6931a 0%, #e4761b 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>M</div>
                <div>
                  <Text strong style={{ fontSize: 16 }}>MetaMask</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>最受欢迎的以太坊钱包</Text>
                </div>
              </Space>
            </Card>
            <Card hoverable onClick={() => handleWalletSelect('WalletConnect')} style={{ cursor: 'pointer' }}>
              <Space>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3b99fc 0%, #1e88e5 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>W</div>
                <div>
                  <Text strong style={{ fontSize: 16 }}>WalletConnect</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>支持多种移动端钱包</Text>
                </div>
              </Space>
            </Card>
          </Space>
        </Modal>

        {error && <Alert message="连接失败" description={error.message} type="error" showIcon style={{ marginTop: 16, maxWidth: 300 }} />}
      </>
    );
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制地址',
      onClick: handleCopyAddress,
    },
    {
      key: 'etherscan',
      icon: <LinkOutlined />,
      label: '在 Etherscan 查看',
      onClick: handleViewOnEtherscan,
    },
    { type: 'divider' },
    {
      key: 'disconnect',
      icon: <DisconnectOutlined />,
      label: '断开连接',
      onClick: disconnectWallet,
      danger: true,
    },
  ];

  return (
    <Space size="large">
      {isWrongNetwork && (
        <Tooltip title="请切换到 Sepolia 测试网">
          <Button
            type="primary"
            danger
            icon={<WarningOutlined />}
            onClick={switchToSepolia}
            style={{ height: 48, borderRadius: 12 }}
          >
            错误网络
          </Button>
        </Tooltip>
      )}

      <Badge dot color={isWrongNetwork ? 'red' : 'green'}>
        <Text style={{ color: 'rgba(17, 24, 39, 0.85)', fontWeight: 500 }}>
          Sepolia
        </Text>
      </Badge>

      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button size="large" style={{ height: 48, borderRadius: 12 }}>
          <Space>
            <WalletOutlined />
            <div>
              <Text style={{ color: '#111827' }}>{formatAddress(walletInfo.address)}</Text><br />
              <Text style={{ color: 'rgba(17, 24, 39, 0.65)', fontSize: 12 }}>{formatBalance(walletInfo.balance)} ETH</Text>
            </div>
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
    </Space>
  );
};

export default WalletConnection;
