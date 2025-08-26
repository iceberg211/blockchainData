import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { Button, Input, Form, Select, InputNumber, Spin, Alert, Typography, Space, message, Steps, Card } from 'antd';
import { SendOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { CONTRACT_ADDRESSES } from '../config/web3';
import ERC20_ABI from '../config/erc20.abi.json';

const { Text, Link } = Typography;
const { Option } = Select;

const TOKENS = {
  ETH: { symbol: 'ETH', address: '', decimals: 18 },
  USDT: { symbol: 'USDT', address: CONTRACT_ADDRESSES.TOKENS.USDT, decimals: 6 },
  DAI: { symbol: 'DAI', address: CONTRACT_ADDRESSES.TOKENS.DAI, decimals: 18 },
  LINK: { symbol: 'LINK', address: CONTRACT_ADDRESSES.TOKENS.LINK, decimals: 18 },
};

interface TransferFormProps {
  onTransactionSubmit?: (txHash: string) => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onTransactionSubmit }) => {
  const { walletInfo, getProvider, library } = useWeb3();
  const [form] = Form.useForm();

  const [selectedToken, setSelectedToken] = useState('ETH');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const [allowance, setAllowance] = useState(ethers.MaxUint256);
  const [isApproving, setIsApproving] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<number | null>(null);

  const needsApproval = useMemo(() => {
    if (selectedToken === 'ETH') return false;
    const amount = form.getFieldValue('amount') || '0';
    if (parseFloat(amount) === 0) return false;
    const amountWei = ethers.parseUnits(amount.toString(), TOKENS[selectedToken].decimals);
    return amountWei > allowance;
  }, [allowance, selectedToken, form.getFieldValue('amount')]);

  const fetchTokenBalance = async () => {
    if (!walletInfo.address || !library) return;
    setIsBalanceLoading(true);
    try {
      if (selectedToken === 'ETH') {
        setTokenBalance(walletInfo.balance);
      } else {
        const tokenAddress = TOKENS[selectedToken].address;
        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
          setTokenBalance('0');
          return;
        }
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, library);
        const balance = await contract.balanceOf(walletInfo.address);
        setTokenBalance(ethers.formatUnits(balance, TOKENS[selectedToken].decimals));
      }
    } catch (e) {
      console.error('Failed to fetch token balance:', e);
      setTokenBalance('0');
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const checkAllowance = async () => {
    if (selectedToken === 'ETH' || !walletInfo.address || !library) {
      setAllowance(ethers.MaxUint256);
      return;
    }
    const tokenAddress = TOKENS[selectedToken].address;
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      setAllowance(BigInt(0));
      return;
    }
    setIsApprovalLoading(true);
    try {
      const spenderAddress = form.getFieldValue('recipient');
      if (!spenderAddress || !ethers.isAddress(spenderAddress)) {
        setAllowance(BigInt(0));
        return;
      }
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, library);
      const currentAllowance = await contract.allowance(walletInfo.address, spenderAddress);
      setAllowance(currentAllowance);
    } catch (e) {
      console.error('Failed to check allowance:', e);
      setAllowance(BigInt(0));
    } finally {
      setIsApprovalLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenBalance();
    checkAllowance();
    form.setFieldsValue({ amount: '' });
  }, [selectedToken, walletInfo.address, library]);

  const handleApprove = async () => {
    const amount = form.getFieldValue('amount');
    const recipient = form.getFieldValue('recipient');
    if (!amount) {
      message.error('请输入金额以进行批准');
      return;
    }
    if (!recipient || !ethers.isAddress(recipient)) {
      message.error('请输入有效的收款地址');
      return;
    }

    setIsApproving(true);
    setError('');
    setApproveTxHash('');
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const tokenAddress = TOKENS[selectedToken].address;
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const amountToApprove = ethers.parseUnits(amount.toString(), TOKENS[selectedToken].decimals);
      
      // Estimate gas for approval
      const estimatedGasLimit = await contract.approve.estimateGas(recipient, amountToApprove);
      setEstimatedGas(ethers.formatUnits(estimatedGasLimit, 'gwei'));

      const tx = await contract.approve(recipient, amountToApprove, { gasLimit: estimatedGasLimit });

      setApproveTxHash(tx.hash);
      await tx.wait();
      message.success('批准成功！');
      await checkAllowance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || '批准失败');
      message.error('批准失败');
    } finally {
      setIsApproving(false);
    }
  };

  const handleFinish = async (values: { recipient: string; amount: string; message?: string }) => {
    setIsLoading(true);
    setError('');
    setTxHash('');
    setEstimatedGas(null);
    setTxStep(0);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      if (selectedToken === 'ETH') {
        const txRequest = {
          to: values.recipient,
          value: ethers.parseEther(values.amount),
          data: values.message ? ethers.toUtf8Bytes(values.message) : '0x',
        };
        const estimatedGasLimit = await signer.estimateGas(txRequest);
        setEstimatedGas(ethers.formatUnits(estimatedGasLimit, 'gwei'));

        const tx = await signer.sendTransaction({ ...txRequest, gasLimit: estimatedGasLimit });
        setTxHash(tx.hash);
        onTransactionSubmit?.(tx.hash);
        await tx.wait();
      } else {
        const tokenAddress = TOKENS[selectedToken].address;
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const amountWei = ethers.parseUnits(values.amount, TOKENS[selectedToken].decimals);

        const txData = contract.interface.encodeFunctionData('transfer', [values.recipient, amountWei]);
        const txRequest = { to: tokenAddress, data: txData };

        const estimatedGasLimit = await signer.estimateGas(txRequest);
        setEstimatedGas(ethers.formatUnits(estimatedGasLimit, 'gwei'));

        const tx = await signer.sendTransaction({ ...txRequest, gasLimit: estimatedGasLimit });
        setTxHash(tx.hash);
        onTransactionSubmit?.(tx.hash);
        await tx.wait();
      }

      setTxStep(1);
      message.success('交易成功！');
      form.resetFields();
      fetchTokenBalance();
    } catch (err: unknown) {
      setTxStep(null);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || '转账失败');
      message.error('转账失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxAmount = () => {
    form.setFieldsValue({ amount: tokenBalance });
  };

  const currentStep = isApproving ? 0 : (approveTxHash ? 1 : 0);

  return (
    <Card title={<Space><SendOutlined />转账</Space>}>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="代币">
          <Select defaultValue="ETH" size="large" onChange={setSelectedToken}>
            {Object.keys(TOKENS).map(token => (
              <Option key={token} value={token} disabled={!TOKENS[token].address && token !== 'ETH'}>
                {token}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="recipient"
          label="收款地址"
          rules={[{ required: true, message: '请输入收款地址' }, { validator: (_, v) => ethers.isAddress(v) ? Promise.resolve() : Promise.reject('地址格式不正确')}]}
        >
          <Input placeholder="0x..." size="large" />
        </Form.Item>

        <Form.Item label="金额">
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              noStyle
              name="amount"
              rules={[{ required: true, message: ' ' }, { validator: (_, v) => v > 0 ? Promise.resolve() : Promise.reject('金额需大于0')}]}
            >
              <InputNumber
                size="large"
                placeholder="0.0"
                stringMode
                style={{ width: 'calc(100% - 80px)' }}
                controls={false}
              />
            </Form.Item>
            <Button size="large" onClick={handleMaxAmount}>最大</Button>
          </Space.Compact>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            余额: {isBalanceLoading ? <Spin size="small" /> : `${parseFloat(tokenBalance).toFixed(4)} ${selectedToken}`}
          </Text>
        </Form.Item>

        {selectedToken === 'ETH' && (
          <Form.Item name="message" label="数据留言 (仅ETH)">
            <Input.TextArea placeholder="可选" rows={3} />
          </Form.Item>
        )}

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}
        
        {estimatedGas && <Alert message={`预估 Gas (Gwei): ${estimatedGas}`} type="info" style={{ marginBottom: 24 }} />}

        {selectedToken !== 'ETH' && (
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Steps.Step title="批准" description={approveTxHash ? <Link href={`https://sepolia.etherscan.io/tx/${approveTxHash}`} target="_blank">查看交易</Link> : '授权代币花费'} />
            <Steps.Step title="转账" description="发送代币" />
          </Steps>
        )}

        {txStep !== null && (
          <Steps size="small" current={txStep} style={{ marginBottom: 24 }}>
            <Steps.Step
              title="发送中"
              icon={<LoadingOutlined />}
              description={txHash ? <Link href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">查看交易</Link> : '等待网络确认'}
            />
            <Steps.Step title="已确认" icon={<CheckCircleOutlined />} />
          </Steps>
        )}

        <Form.Item>
          {needsApproval ? (
            <Button type="primary" size="large" block loading={isApproving || isApprovalLoading} onClick={handleApprove} icon={<CheckCircleOutlined />}>
              批准 {form.getFieldValue('amount')} {selectedToken}
            </Button>
          ) : (
            <Button type="primary" size="large" htmlType="submit" block loading={isLoading} disabled={!walletInfo.isConnected} icon={<SendOutlined />}>
              发送
            </Button>
          )}
        </Form.Item>

        {parseFloat(tokenBalance) < (form.getFieldValue('amount') || 0) && (
          <Alert
            message="余额不足"
            type="warning"
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => message.info('兑换功能开发中...')}>
                去兑换
              </Button>
            }
          />
        )}
      </Form>
    </Card>
  );
};

export default TransferForm;
