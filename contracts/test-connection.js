#!/usr/bin/env node

// 测试网络连接脚本
const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 测试 Truffle 网络连接...\n');

  // 检查环境变量
  console.log('📋 检查环境变量:');
  console.log(`MNEMONIC: ${process.env.MNEMONIC ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`INFURA_KEY: ${process.env.INFURA_KEY ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`ALCHEMY_KEY: ${process.env.ALCHEMY_KEY ? '✅ 已设置' : '❌ 未设置'}`);

  // 检查是否使用默认值
  if (process.env.MNEMONIC === 'test test test test test test test test test test test junk') {
    console.log('⚠️  警告: 使用的是测试助记词，请替换为您的真实钱包助记词');
  }
  
  if (process.env.INFURA_KEY === 'demo_key' || process.env.INFURA_KEY === 'your_infura_project_id') {
    console.log('❌ 错误: Infura Key 使用的是占位符，请设置真实的 API Key');
    return;
  }

  console.log('\n🌐 测试网络连接...');

  try {
    // 测试 Infura 连接
    const infuraUrl = `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`;
    console.log(`连接到: ${infuraUrl}`);

    const provider = new HDWalletProvider(
      process.env.MNEMONIC,
      infuraUrl
    );

    const Web3 = require('web3');
    const web3 = new Web3(provider);

    // 获取网络信息
    const networkId = await web3.eth.net.getId();
    const blockNumber = await web3.eth.getBlockNumber();
    const accounts = await web3.eth.getAccounts();

    console.log(`✅ 网络 ID: ${networkId} (应该是 11155111 for Sepolia)`);
    console.log(`✅ 当前区块: ${blockNumber}`);
    console.log(`✅ 钱包地址: ${accounts[0]}`);

    // 检查余额
    const balance = await web3.eth.getBalance(accounts[0]);
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    console.log(`💰 余额: ${balanceEth} ETH`);

    if (parseFloat(balanceEth) < 0.01) {
      console.log('⚠️  警告: 余额不足，建议至少有 0.01 ETH 用于部署');
      console.log('   获取测试 ETH: https://sepoliafaucet.com/');
    }

    provider.engine.stop();
    console.log('\n✅ 网络连接测试成功！可以尝试部署合约。');

  } catch (error) {
    console.log(`❌ 连接失败: ${error.message}`);
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查 Infura API Key 是否正确');
    console.log('2. 检查网络连接');
    console.log('3. 检查助记词格式是否正确');
  }
}

testConnection().catch(console.error);
