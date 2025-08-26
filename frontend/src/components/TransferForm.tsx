import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [estimatedGasLimit, setEstimatedGasLimit] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'submitted' | 'confirmed'>('idle');
  const [confirmations, setConfirmations] = useState(0);
  const TARGET_CONFIRMATIONS = 2;
  const [isSpeedingUp, setIsSpeedingUp] = useState(false);
  const [lastTxRequest, setLastTxRequest] = useState<any | null>(null);
  const [lastTxNonce, setLastTxNonce] = useState<number | null>(null);
  const blockListenerRef = useRef<((blockNumber: number) => void) | null>(null);
  const providerRef = useRef<any>(null);

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
      
      // Estimate gas for approval and fee
      const gasLimit = await contract.approve.estimateGas(recipient, amountToApprove);
      const feeData = await provider.getFeeData();
      const price = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const feeWei = price * gasLimit;
      setEstimatedGasLimit(gasLimit.toString());
      setEstimatedFee(ethers.formatEther(feeWei));

      const tx = await contract.approve(recipient, amountToApprove, { gasLimit });
      
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

  // 暂时去掉附加消息功能，仅发送普通转账
  const handleFinish = async (values: { recipient: string; amount: string }) => {
    setIsLoading(true);
    setError('');
    setTxHash('');
    setEstimatedGasLimit(null);
    setEstimatedFee(null);
    setTxStep(0);
    setTxStatus('idle');
    setConfirmations(0);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      if (selectedToken === 'ETH') {
        const txRequest = {
          to: values.recipient,
          value: ethers.parseEther(values.amount),
        };
        const gasLimit = await signer.estimateGas(txRequest);
        const feeData = await (await getProvider()).getFeeData();
        const price = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        const feeWei = price * gasLimit;
        setEstimatedGasLimit(gasLimit.toString());
        setEstimatedFee(ethers.formatEther(feeWei));

        const tx = await signer.sendTransaction({ ...txRequest, gasLimit });
        setTxHash(tx.hash);
        onTransactionSubmit?.(tx.hash);
        setTxStatus('submitted');
        setLastTxRequest({ ...txRequest, gasLimit });
        setLastTxNonce(tx.nonce);

        // Track confirmations
        const provider = getProvider();
        providerRef.current = provider;
        let minedBlock: number | null = null;
        const onBlock = async (blockNumber: number) => {
          try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (receipt && receipt.blockNumber) {
              if (minedBlock === null) minedBlock = Number(receipt.blockNumber);
              const conf = Math.max(0, Number(blockNumber) - minedBlock + 1);
              setConfirmations(conf);
              if (conf >= TARGET_CONFIRMATIONS) {
                provider.off('block', onBlock);
                setTxStatus('confirmed');
                setTxStep(1);
                setIsLoading(false);
              }
            }
          } catch {}
        };
        blockListenerRef.current = onBlock;
        provider.on('block', onBlock);
        tx.wait(TARGET_CONFIRMATIONS).then(() => {
          setConfirmations(TARGET_CONFIRMATIONS);
          setTxStatus('confirmed');
          setTxStep(1);
          setIsLoading(false);
          provider.removeAllListeners && provider.removeAllListeners('block');
        }).catch(() => {});
      } else {
        const tokenAddress = TOKENS[selectedToken].address;
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const amountWei = ethers.parseUnits(values.amount, TOKENS[selectedToken].decimals);

        const txData = contract.interface.encodeFunctionData('transfer', [values.recipient, amountWei]);
        const txRequest = { to: tokenAddress, data: txData };

        const gasLimit = await signer.estimateGas(txRequest);
        const feeData = await (await getProvider()).getFeeData();
        const price = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        const feeWei = price * gasLimit;
        setEstimatedGasLimit(gasLimit.toString());
        setEstimatedFee(ethers.formatEther(feeWei));

        const tx = await signer.sendTransaction({ ...txRequest, gasLimit });
        setTxHash(tx.hash);
        onTransactionSubmit?.(tx.hash);
        setTxStatus('submitted');
        setLastTxRequest({ ...txRequest, gasLimit });
        setLastTxNonce(tx.nonce);

        const provider = getProvider();
        providerRef.current = provider;
        let minedBlock: number | null = null;
        const onBlock = async (blockNumber: number) => {
          try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (receipt && receipt.blockNumber) {
              if (minedBlock === null) minedBlock = Number(receipt.blockNumber);
              const conf = Math.max(0, Number(blockNumber) - minedBlock + 1);
              setConfirmations(conf);
              if (conf >= TARGET_CONFIRMATIONS) {
                provider.off('block', onBlock);
                setTxStatus('confirmed');
                setTxStep(1);
                setIsLoading(false);
              }
            }
          } catch {}
        };
        blockListenerRef.current = onBlock;
        provider.on('block', onBlock);
        tx.wait(TARGET_CONFIRMATIONS).then(() => {
          setConfirmations(TARGET_CONFIRMATIONS);
          setTxStatus('confirmed');
          setTxStep(1);
          setIsLoading(false);
          provider.removeAllListeners && provider.removeAllListeners('block');
        }).catch(() => {});
      }

      message.success('交易已提交');
      form.resetFields(['amount']);
      fetchTokenBalance();
    } catch (err: unknown) {
      setTxStep(null);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || '转账失败');
      message.error('转账失败');
      setIsLoading(false);
    } finally {
      // isLoading 在确认完成时置为 false；异常情况下在 catch 设置
    }
  };

  const handleSpeedUp = async () => {
    if (!lastTxRequest || lastTxNonce === null) return;
    try {
      setIsSpeedingUp(true);
      const provider = getProvider();
      const signer = await provider.getSigner();

      // stop previous listener
      if (providerRef.current && blockListenerRef.current) {
        try { providerRef.current.off('block', blockListenerRef.current); } catch {}
      }

      // compute bumped fees
      const feeData = await provider.getFeeData();
      let txOverrides: any = { nonce: lastTxNonce };
      if (feeData.maxFeePerGas || feeData.maxPriorityFeePerGas) {
        const suggestedPriority = feeData.maxPriorityFeePerGas ?? 1n;
        const suggestedMax = feeData.maxFeePerGas ?? suggestedPriority * 2n;
        const bump = (v: bigint) => (v * 12n) / 10n + 1n; // +20%
        txOverrides.maxPriorityFeePerGas = bump(suggestedPriority);
        txOverrides.maxFeePerGas = bump(suggestedMax);
      } else if (feeData.gasPrice) {
        const bump = (v: bigint) => (v * 12n) / 10n + 1n;
        txOverrides.gasPrice = bump(feeData.gasPrice);
      }

      const accelerated = await signer.sendTransaction({ ...lastTxRequest, ...txOverrides });
      setTxHash(accelerated.hash);
      setTxStatus('submitted');

      // re-attach listener for new hash
      providerRef.current = provider;
      let minedBlock: number | null = null;
      const onBlock = async (blockNumber: number) => {
        try {
          const receipt = await provider.getTransactionReceipt(accelerated.hash);
          if (receipt && receipt.blockNumber) {
            if (minedBlock === null) minedBlock = Number(receipt.blockNumber);
            const conf = Math.max(0, Number(blockNumber) - minedBlock + 1);
            setConfirmations(conf);
            if (conf >= TARGET_CONFIRMATIONS) {
              provider.off('block', onBlock);
              setTxStatus('confirmed');
              setTxStep(1);
              setIsLoading(false);
            }
          }
        } catch {}
      };
      blockListenerRef.current = onBlock;
      provider.on('block', onBlock);
      accelerated.wait(TARGET_CONFIRMATIONS).then(() => {
        setConfirmations(TARGET_CONFIRMATIONS);
        setTxStatus('confirmed');
        setTxStep(1);
        setIsLoading(false);
        provider.removeAllListeners && provider.removeAllListeners('block');
      }).catch(() => {});

      message.success('已提交加速交易');
    } catch (e) {
      console.error('Speed up failed', e);
      message.error('加速失败，请稍后重试');
    } finally {
      setIsSpeedingUp(false);
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

        {false && selectedToken === 'ETH' && (
          // 已暂时下线留言功能
          <Form.Item name="message" label="数据留言 (仅ETH)">
            <Input.TextArea placeholder="可选" rows={3} />
          </Form.Item>
        )}

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

        {(estimatedGasLimit || estimatedFee) && (
          <Alert
            type="info"
            style={{ marginBottom: 24 }}
            message={`预估 Gas: ${estimatedGasLimit ?? '-'} | 预估费用: ${estimatedFee ?? '-'} ETH`}
          />
        )}

        {selectedToken !== 'ETH' && (
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Steps.Step title="批准" description={approveTxHash ? <Link href={`https://sepolia.etherscan.io/tx/${approveTxHash}`} target="_blank">查看交易</Link> : '授权代币花费'} />
            <Steps.Step title="转账" description="发送代币" />
          </Steps>
        )}

        {txHash && (
          <Steps size="small" current={txStatus === 'confirmed' ? 1 : 0} style={{ marginBottom: 24 }}>
            <Steps.Step
              title="已提交"
              description={
                txHash ? (
                  <Link href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">查看交易</Link>
                ) : (
                  '等待广播'
                )
              }
            />
            <Steps.Step
              title={txStatus === 'confirmed' ? '已确认' : '确认中'}
              description={txStatus === 'confirmed' ? `已获得 ${TARGET_CONFIRMATIONS} 个确认` : `已确认 ${Math.min(confirmations, TARGET_CONFIRMATIONS)}/${TARGET_CONFIRMATIONS}`}
              icon={txStatus === 'confirmed' ? <CheckCircleOutlined /> : <LoadingOutlined />}
            />
          </Steps>
        )}

        {txHash && txStatus === 'submitted' && (
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSpeedUp} loading={isSpeedingUp}>
              加速交易
            </Button>
          </Space>
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
