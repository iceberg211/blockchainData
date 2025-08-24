# 部署指南

## 📋 部署前准备

### 1. 获取必要的 API Keys

#### Infura
1. 访问 https://infura.io/
2. 注册账户并创建新项目
3. 复制项目 ID 作为 `INFURA_KEY`

#### Alchemy
1. 访问 https://alchemy.com/
2. 注册账户并创建 Ethereum Sepolia 应用
3. 复制 API Key 作为 `ALCHEMY_KEY`

#### Etherscan
1. 访问 https://etherscan.io/apis
2. 注册账户并创建 API Key
3. 复制 API Key 作为 `ETHERSCAN_API_KEY`

### 2. 准备钱包

1. 安装 MetaMask 浏览器扩展
2. 创建或导入钱包
3. 切换到 Sepolia 测试网
4. 获取测试 ETH：https://sepoliafaucet.com/

## 🚀 部署步骤

### Step 1: 环境配置

```bash
# 克隆项目
git clone <repository-url>
cd blockchain-dapp

# 配置前端环境变量
cd frontend
cp .env.example .env
# 编辑 .env 文件，填入 API Keys

# 配置合约环境变量
cd ../contracts
cp .env.example .env
# 编辑 .env 文件，填入助记词和 API Keys
```

### Step 2: 安装依赖

```bash
# 前端依赖
cd frontend
pnpm install

# 合约依赖
cd ../contracts
pnpm install
```

### Step 3: 编译智能合约

```bash
cd contracts
npx truffle compile
```

### Step 4: 部署智能合约到 Sepolia

```bash
# 使用 Infura 部署
npx truffle migrate --network sepolia

# 或使用 Alchemy 部署（备用）
npx truffle migrate --network sepolia_alchemy
```

### Step 5: 验证合约

```bash
npx truffle run verify DataStorage --network sepolia
```

### Step 6: 更新前端配置

部署成功后，将合约地址更新到前端配置文件：

```javascript
// frontend/src/config/web3.ts
export const CONTRACT_ADDRESSES = {
  DATA_STORAGE: '0x...', // 部署后的合约地址
  USDT_SEPOLIA: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
};
```

### Step 7: 启动前端应用

```bash
cd frontend
pnpm run dev
```

## 🔧 配置详解

### 网络配置

Sepolia 测试网配置：
- Chain ID: 11155111
- RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
- Block Explorer: https://sepolia.etherscan.io

### Gas 费设置

- Gas Limit: 4,000,000
- Gas Price: 10 Gwei
- 建议准备至少 0.1 ETH 用于部署和测试

## 📊 部署验证

### 1. 合约验证

访问 Sepolia Etherscan 确认：
- 合约已成功部署
- 源码已验证
- 交易记录正常

### 2. 前端功能测试

- 钱包连接正常
- 转账功能可用
- 交易历史显示
- 事件日志记录

## 🛠 故障排除

### 常见部署问题

1. **Gas 费不足**
   ```
   Error: insufficient funds for gas * price + value
   ```
   解决：获取更多 Sepolia ETH

2. **网络连接问题**
   ```
   Error: CONNECTION ERROR: Couldn't connect to node
   ```
   解决：检查 API Key 和网络配置

3. **合约验证失败**
   ```
   Error: Verification failed
   ```
   解决：确保 Etherscan API Key 正确

### 调试技巧

1. 使用 `truffle console` 进行交互式调试
2. 查看 Sepolia Etherscan 的详细错误信息
3. 检查环境变量配置是否正确

## 🔄 更新部署

### 重新部署合约

```bash
# 重新编译
npx truffle compile

# 重新部署（会创建新的合约实例）
npx truffle migrate --reset --network sepolia
```

### 更新前端

```bash
cd frontend
pnpm run build
# 部署到您的托管服务
```

## 📈 生产环境注意事项

1. **安全性**
   - 不要在代码中硬编码私钥
   - 使用环境变量管理敏感信息
   - 定期轮换 API Keys

2. **性能优化**
   - 启用合约优化器
   - 使用 CDN 加速前端资源
   - 实现适当的缓存策略

3. **监控**
   - 设置交易监控
   - 跟踪 Gas 费用变化
   - 监控 API 调用限制

---

部署完成后，您的 DApp 将在 Sepolia 测试网上运行，用户可以通过 Web 界面与智能合约交互。
