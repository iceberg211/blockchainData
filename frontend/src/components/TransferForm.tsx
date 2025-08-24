import React, { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { Form, Input, InputNumber, Button, Alert, Card, Space, Typography } from 'antd';
import { SendOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface TransferFormProps {
  onTransactionSubmit?: (txHash: string) => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onTransactionSubmit }) => {
  const { walletInfo, getProvider } = useWeb3();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const readableBalance = useMemo(() => {
    const n = parseFloat(walletInfo.balance || '0');
    if (Number.isNaN(n)) return '0.0000';
    return n.toFixed(4);
  }, [walletInfo.balance]);

  const addressRule = async (_: any, value: string) => {
    if (!value) return Promise.reject('请输入收款地址');
    if (!ethers.isAddress(value)) return Promise.reject('收款地址格式不正确');
    return Promise.resolve();
  };

  const handleFinish = async (values: { recipient: string; amount: number; message?: string }) => {
    setIsLoading(true);
    setError('');
    setTxHash('');

    try {
      const provider = getProvider();
      const signer = provider.getSigner();

      const to = values.recipient;
      const amountWei = ethers.parseEther(String(values.amount));
      const dataBytes = values.message ? ethers.toUtf8Bytes(values.message) : '0x';

      // 估算 Gas 费用
      const feeData = await provider.getFeeData();
      const estimatedGas = await provider.estimateGas({ to, value: amountWei, data: dataBytes });
      const gasPrice = (feeData.gasPrice ?? ethers.parseUnits('20', 'gwei')) as bigint;
      const gasCost = (estimatedGas as bigint) * gasPrice;
      const totalCost = (amountWei as bigint) + gasCost;

      if (totalCost > ethers.parseEther(walletInfo.balance)) {
        setError('余额不足以支付交易费用');
        return;
      }

      const tx = await signer.sendTransaction({
        to,
        value: amountWei,
        data: dataBytes,
        gasLimit: estimatedGas,
        gasPrice: feeData.gasPrice,
      });

      setTxHash(tx.hash);
      onTransactionSubmit?.(tx.hash);
      await tx.wait();
      form.resetFields();
    } catch (err: any) {
      console.error('Transfer failed:', err);
      setError(err.message || '转账失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: 'none',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(102,126,234,0.12)'
      }}
      title={
        <Space>
          <SendOutlined />
          <span>ETH 转账</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        onValuesChange={() => error && setError('')}
        disabled={isLoading}
      >
        <Form.Item
          name="recipient"
          label="收款地址"
          tooltip={{ title: '请输入以 0x 开头的有效以太坊地址', icon: <InfoCircleOutlined /> }}
          rules={[{ validator: addressRule }]}
        >
          <Input placeholder="0x..." allowClear size="large" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="转账金额 (ETH)"
          rules={[
            { required: true, message: '请输入转账金额' },
            {
              validator: (_: any, value: number) => {
                if (value === undefined || value === null) return Promise.reject('请输入转账金额');
                if (value <= 0) return Promise.reject('金额需大于 0');
                if (value > parseFloat(walletInfo.balance || '0')) return Promise.reject('余额不足');
                return Promise.resolve();
              },
            },
          ]}
          extra={<span>余额: {readableBalance} ETH</span>}
        >
          <InputNumber
            size="large"
            min={0}
            stringMode
            step="0.0001"
            controls={false}
            placeholder="0.0"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="message"
          label="数据留言"
          tooltip={{ title: '可选，作为交易数据存储在链上', icon: <InfoCircleOutlined /> }}
        >
          <Input.TextArea
            placeholder="可选的链上数据留言..."
            rows={3}
            autoSize={{ minRows: 3, maxRows: 6 }}
            allowClear
          />
        </Form.Item>

        {error && (
          <Alert type="error" showIcon message="提交失败" description={error} style={{ marginBottom: 16 }} />
        )}

        {txHash && (
          <Alert
            type="success"
            showIcon
            message="交易已提交"
            description={
              <Typography.Link href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </Typography.Link>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Button
          type="primary"
          size="large"
          htmlType="submit"
          icon={<SendOutlined />}
          loading={isLoading}
          disabled={!walletInfo.isConnected}
          block
        >
          发送交易
        </Button>
      </Form>
    </Card>
  );
};

export default TransferForm;
