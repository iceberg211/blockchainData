# 数据上链系统 (Blockchain Data Storage DApp)

一个完整的去中心化应用，支持多种方式将数据存储到区块链上。

## 🌟 项目特性

- **钱包集成**: 支持 MetaMask、WalletConnect 等主流钱包
- **多种存储方式**: 
  - 直接交易存储（ETH 转账 + 数据留言）
  - 智能合约事件日志存储
  - USDT 代币转账（规划中）
- **链上数据读取**: 使用 Ethers.js 和外部 API 读取交易历史
- **实时数据展示**: 美观的用户界面展示链上数据
- **网络支持**: Ethereum Sepolia 测试网

## 🏗 项目结构

```
blockchain-dapp/
├── frontend/          # React + Vite 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── config/        # Web3 配置
│   │   └── ...
│   ├── package.json
│   └── .env.example
├── contracts/         # Truffle 智能合约项目
│   ├── contracts/         # Solidity 合约
│   ├── migrations/        # 部署脚本
│   ├── test/             # 合约测试
│   ├── truffle-config.js
│   └── .env.example
├── subgraph/         # The Graph 子图（规划中）
└── docs/             # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm
- MetaMask 钱包
- Sepolia 测试网 ETH

### 1. 克隆项目

```bash
git clone <repository-url>
cd blockchain-dapp
```

### 2. 启动前端应用

```bash
cd frontend
pnpm install
cp .env.example .env
# 编辑 .env 文件，填入您的 API Keys
pnpm run dev
```

### 3. 部署智能合约

```bash
cd contracts
pnpm install
cp .env.example .env
# 编辑 .env 文件，填入您的钱包助记词和 API Keys
npx truffle compile
npx truffle migrate --network sepolia
```

## 🔧 配置说明

### 前端环境变量 (.env)

```env
VITE_INFURA_KEY=your_infura_project_id
VITE_ALCHEMY_KEY=your_alchemy_api_key
VITE_ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 智能合约环境变量 (.env)

```env
MNEMONIC=your twelve word mnemonic phrase
INFURA_KEY=your_infura_project_id
ALCHEMY_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 📱 功能演示

### 1. 钱包连接
- 点击右上角"连接钱包"按钮
- 选择 MetaMask 或 WalletConnect
- 确保连接到 Sepolia 测试网

### 2. 直接交易存储
- 选择"转账方式"选项卡
- 输入收款地址、转账金额和数据留言
- 点击"发送交易"完成数据上链

### 3. 智能合约存储
- 选择"日志方式"选项卡
- 通过智能合约存储结构化数据
- 支持事件日志查询和检索

### 4. 交易历史查看
- 右侧面板显示所有相关交易
- 支持查看交易详情和数据留言
- 点击交易哈希跳转到 Etherscan

## 🔗 技术栈

- **前端**: React 18 + Vite + TypeScript + Tailwind CSS
- **Web3**: web3-react + ethers.js v6
- **智能合约**: Solidity + Truffle + OpenZeppelin
- **区块链**: Ethereum Sepolia 测试网
- **数据索引**: The Graph Protocol（规划中）
- **API 服务**: Infura + Alchemy + Etherscan

## 📋 开发进度

- [x] 前端基础架构搭建
- [x] 钱包集成功能
- [x] 直接交易功能
- [x] 链上数据读取
- [x] 智能合约开发
- [x] 合约编译测试
- [ ] 合约部署到 Sepolia
- [ ] The Graph 子图开发
- [ ] USDT 转账功能
- [ ] 合约验证
- [ ] 完整测试

## 🛠 部署指南

### Sepolia 测试网部署

1. 获取 Sepolia 测试 ETH: https://sepoliafaucet.com/
2. 配置环境变量
3. 执行部署命令:

```bash
cd contracts
npx truffle migrate --network sepolia
```

### 合约验证

```bash
npx truffle run verify DataStorage --network sepolia
```

## 📚 API 文档

### 智能合约接口

```solidity
// 存储数据
function storeData(address _recipient, string memory _message) external payable

// 批量存储
function batchStoreData(address[] memory _recipients, uint256[] memory _amounts, string[] memory _messages) external payable

// 获取记录
function getRecord(uint256 _recordId) external view returns (DataRecord memory)

// 获取用户记录
function getUserRecords(address _user) external view returns (uint256[] memory)
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License

## 🆘 故障排除

### 常见问题

1. **钱包连接失败**: 确保安装了 MetaMask 并连接到 Sepolia 网络
2. **交易失败**: 检查账户余额和 Gas 费设置
3. **合约调用失败**: 确认合约地址和 ABI 配置正确

### 获取帮助

- 查看项目 Issues
- 联系开发团队
- 参考官方文档

---

**注意**: 这是一个测试项目，请不要在主网上使用真实资金。
