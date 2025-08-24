import { useState } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import { ConfigProvider, Layout, Tabs, Card, Badge, Typography, Space, Row, Col } from 'antd';
import { WalletOutlined, SendOutlined, FileTextOutlined, DollarOutlined, RocketOutlined } from '@ant-design/icons';
import WalletConnection from './components/WalletConnection';
import TransferForm from './components/TransferForm';
import TransactionHistory from './components/TransactionHistory';
import ContractInteraction from './components/ContractInteraction';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Web3 Provider 工厂函数
function getLibrary(provider: any) {
  return new ethers.BrowserProvider(provider);
}

// Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: '#667eea',
    colorBgContainer: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.95)',
      headerPadding: '0 24px',
    },
    Tabs: {
      cardBg: 'rgba(255, 255, 255, 0.95)',
      itemActiveColor: '#667eea',
      itemHoverColor: '#764ba2',
      inkBarColor: '#667eea',
    },
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: '0 6px 24px rgba(102, 126, 234, 0.08)',
    },
  },
};

function App() {
  const [recentTransactions, setRecentTransactions] = useState<string[]>([]);

  const handleTransactionSubmit = (txHash: string) => {
    setRecentTransactions(prev => [txHash, ...prev.slice(0, 4)]);
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <Space size="small">
          <SendOutlined />
          <span>转账方式</span>
        </Space>
      ),
      children: <TransferForm onTransactionSubmit={handleTransactionSubmit} />,
    },
    {
      key: '2',
      label: (
        <Space size="small">
          <FileTextOutlined />
          <span>日志方式</span>
        </Space>
      ),
      children: <ContractInteraction />,
    },
    {
      key: '3',
      label: (
        <Space size="small">
          <DollarOutlined />
          <span>USDT方式</span>
          <Badge count="敬请期待" size="small" />
        </Space>
      ),
      children: (
        <Card
          className="text-center"
          style={{
            minHeight: 400,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: 'none'
          }}
        >
          <div style={{ padding: '60px 20px' }}>
            <DollarOutlined
              style={{
                fontSize: 64,
                color: '#667eea',
                marginBottom: 24,
                opacity: 0.6
              }}
            />
            <Title level={3} style={{ color: '#667eea', marginBottom: 8 }}>
              USDT 转账功能
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              将在后续版本中提供完整的 USDT 代币转账功能
            </Text>
          </div>
        </Card>
      ),
      disabled: true,
    },
  ];

  return (
    <ConfigProvider theme={theme}>
      <Web3ReactProvider getLibrary={getLibrary}>
        <Layout className="min-h-screen">
          {/* 背景渐变 */}
          <div
            className="fixed inset-0 -z-10"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          />

          {/* 头部导航 */}
          <Header
            className="backdrop-blur-md border-b border-white border-opacity-20"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              height: 80,
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
            }}
          >
            <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
              <Space size="large" align="center">
                <div className="flex items-center gap-3">
                  <RocketOutlined
                    style={{
                      fontSize: 32,
                      color: '#ffffff',
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: 8,
                      borderRadius: 12,
                    }}
                  />
                  <div>
                    <Title
                      level={2}
                      style={{
                        color: '#ffffff',
                        margin: 0,
                        fontWeight: 700,
                        fontSize: 28
                      }}
                    >
                      数据上链系统
                    </Title>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
                      去中心化数据存储平台
                    </Text>
                  </div>
                </div>

                <Badge
                  status="success"
                  text={
                    <Text style={{ color: '#ffffff', fontWeight: 500 }}>
                      Sepolia 测试网络
                    </Text>
                  }
                />
              </Space>

              <WalletConnection />
            </div>
          </Header>

          {/* 主要内容 */}
          <Content style={{ padding: '32px 24px' }}>
            <div className="max-w-7xl mx-auto">
              {/* 选项卡区域 */}
              <Card
                className="mb-8"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: 'none',
                  borderRadius: 20,
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
                }}
              >
                <Tabs
                  defaultActiveKey="1"
                  size="large"
                  type="card"
                  items={tabItems}
                  style={{ margin: -24 }}
                  tabBarStyle={{
                    background: 'transparent',
                    border: 'none',
                    margin: '0 24px',
                    paddingTop: 24,
                  }}
                />
              </Card>

              {/* 内容区域 */}
              <Row gutter={[24, 24]}>
                {/* 左侧：功能区 */}
                <Col xs={24} lg={14}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* 最近交易 */}
                    {recentTransactions.length > 0 && (
                      <Card
                        title={
                          <Space>
                            <WalletOutlined />
                            <span>最近提交的交易</span>
                          </Space>
                        }
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                          border: 'none',
                          borderRadius: 16,
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {recentTransactions.map((txHash) => (
                            <Card
                              key={txHash}
                              size="small"
                              hoverable
                              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: 12,
                                color: '#ffffff',
                              }}
                              bodyStyle={{ padding: '12px 16px' }}
                            >
                              <Text
                                code
                                style={{
                                  color: '#ffffff',
                                  background: 'rgba(255, 255, 255, 0.2)',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                }}
                              >
                                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                              </Text>
                            </Card>
                          ))}
                        </Space>
                      </Card>
                    )}
                  </Space>
                </Col>

                {/* 右侧：数据展示区 */}
                <Col xs={24} lg={10}>
                  <TransactionHistory />
                </Col>
              </Row>

              {/* 底部功能介绍卡片 */}
              <Row gutter={[24, 24]} style={{ marginTop: 48 }}>
                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{
                      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                      border: 'none',
                      borderRadius: 16,
                      height: '100%',
                    }}
                  >
                    <Space direction="vertical" size="middle">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <SendOutlined style={{ fontSize: 24, color: '#d97706' }} />
                        <Title level={4} style={{ margin: 0, color: '#d97706' }}>
                          转账方式
                        </Title>
                      </div>
                      <ul style={{ color: '#92400e', margin: 0, paddingLeft: 20 }}>
                        <li>直接 ETH 转账存储</li>
                        <li>支持数据留言功能</li>
                        <li>实时交易状态跟踪</li>
                        <li>自动 Gas 费估算</li>
                      </ul>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{
                      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                      border: 'none',
                      borderRadius: 16,
                      height: '100%',
                    }}
                  >
                    <Space direction="vertical" size="middle">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileTextOutlined style={{ fontSize: 24, color: '#0891b2' }} />
                        <Title level={4} style={{ margin: 0, color: '#0891b2' }}>
                          智能合约
                        </Title>
                      </div>
                      <ul style={{ color: '#0e7490', margin: 0, paddingLeft: 20 }}>
                        <li>事件日志存储机制</li>
                        <li>结构化数据管理</li>
                        <li>支持批量操作</li>
                        <li>数据完整性验证</li>
                      </ul>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    hoverable
                    style={{
                      background: 'linear-gradient(135deg, #d299c2 0%, #fef9d3 100%)',
                      border: 'none',
                      borderRadius: 16,
                      height: '100%',
                    }}
                  >
                    <Space direction="vertical" size="middle">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <DollarOutlined style={{ fontSize: 24, color: '#7c3aed' }} />
                        <Title level={4} style={{ margin: 0, color: '#7c3aed' }}>
                          USDT 转账
                        </Title>
                      </div>
                      <ul style={{ color: '#6b21a8', margin: 0, paddingLeft: 20 }}>
                        <li>ERC-20 代币支持</li>
                        <li>多网络兼容</li>
                        <li>即将推出功能</li>
                        <li>敬请期待更新</li>
                      </ul>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          </Content>
        </Layout>
      </Web3ReactProvider>
    </ConfigProvider>
  );
}

export default App;
