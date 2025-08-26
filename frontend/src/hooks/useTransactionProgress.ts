import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

export interface UseTxProgressOptions {
  targetConfirmations?: number;
}

export interface EstimateResult {
  gasLimit: bigint;
  feeWei: bigint;
  feeEth: string;
}

export const useTransactionProgress = (
  getProvider: () => ethers.Provider,
  opts: UseTxProgressOptions = {}
) => {
  const TARGET = opts.targetConfirmations ?? 2;

  const [status, setStatus] = useState<'idle' | 'submitted' | 'confirmed'>('idle');
  const [confirmations, setConfirmations] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [estimatedGasLimit, setEstimatedGasLimit] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [isSpeedingUp, setIsSpeedingUp] = useState(false);

  const lastTxRequestRef = useRef<any | null>(null);
  const lastTxNonceRef = useRef<number | null>(null);
  const providerRef = useRef<ethers.Provider | null>(null);
  const blockListenerRef = useRef<((blockNumber: number) => void) | null>(null);

  const cleanupListener = useCallback(() => {
    try {
      if (providerRef.current && blockListenerRef.current) {
        providerRef.current.off('block', blockListenerRef.current);
      }
    } catch {}
    blockListenerRef.current = null;
  }, []);

  useEffect(() => () => cleanupListener(), [cleanupListener]);

  const estimate = useCallback(
    async (signer: ethers.Signer, txRequest: any): Promise<EstimateResult> => {
      const provider = getProvider();
      const gasLimit = await signer.estimateGas(txRequest);
      const feeData = await provider.getFeeData();
      const price = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const feeWei = price * gasLimit;
      const feeEth = ethers.formatEther(feeWei);
      setEstimatedGasLimit(gasLimit.toString());
      setEstimatedFee(feeEth);
      return { gasLimit, feeWei, feeEth };
    },
    [getProvider]
  );

  const track = useCallback(
    async (tx: ethers.TransactionResponse, txRequest?: any) => {
      setTxHash(tx.hash);
      setStatus('submitted');
      setConfirmations(0);
      providerRef.current = getProvider();
      if (typeof tx.nonce === 'number') {
        lastTxNonceRef.current = tx.nonce;
      }
      if (txRequest) {
        lastTxRequestRef.current = txRequest;
      }

      let minedBlock: number | null = null;
      const onBlock = async (blockNumber: number) => {
        try {
          const receipt = await providerRef.current!.getTransactionReceipt(tx.hash);
          if (receipt && receipt.blockNumber) {
            if (minedBlock === null) minedBlock = Number(receipt.blockNumber);
            const conf = Math.max(0, Number(blockNumber) - minedBlock + 1);
            setConfirmations(conf);
            if (conf >= TARGET) {
              cleanupListener();
              setStatus('confirmed');
            }
          }
        } catch {}
      };
      blockListenerRef.current = onBlock;
      providerRef.current.on('block', onBlock);

      tx
        .wait(TARGET)
        .then(() => {
          setConfirmations(TARGET);
          setStatus('confirmed');
          cleanupListener();
        })
        .catch(() => {});
    },
    [TARGET, cleanupListener, getProvider]
  );

  const speedUp = useCallback(
    async (signer: ethers.Signer) => {
      if (!lastTxRequestRef.current || lastTxNonceRef.current === null) return null;
      try {
        setIsSpeedingUp(true);
        cleanupListener();
        const provider = getProvider();
        providerRef.current = provider;

        const feeData = await provider.getFeeData();
        const bump = (v: bigint) => (v * 12n) / 10n + 1n; // +20%
        const overrides: any = { nonce: lastTxNonceRef.current };
        if (feeData.maxFeePerGas || feeData.maxPriorityFeePerGas) {
          const prio = feeData.maxPriorityFeePerGas ?? 1n;
          const max = feeData.maxFeePerGas ?? prio * 2n;
          overrides.maxPriorityFeePerGas = bump(prio);
          overrides.maxFeePerGas = bump(max);
        } else if (feeData.gasPrice) {
          overrides.gasPrice = bump(feeData.gasPrice);
        }

        const accelerated = await signer.sendTransaction({
          ...lastTxRequestRef.current,
          ...overrides,
        });
        setTxHash(accelerated.hash);
        setStatus('submitted');

        let minedBlock: number | null = null;
        const onBlock = async (blockNumber: number) => {
          try {
            const receipt = await provider.getTransactionReceipt(accelerated.hash);
            if (receipt && receipt.blockNumber) {
              if (minedBlock === null) minedBlock = Number(receipt.blockNumber);
              const conf = Math.max(0, Number(blockNumber) - minedBlock + 1);
              setConfirmations(conf);
              if (conf >= TARGET) {
                provider.off('block', onBlock);
                setStatus('confirmed');
              }
            }
          } catch {}
        };
        blockListenerRef.current = onBlock;
        provider.on('block', onBlock);
        accelerated
          .wait(TARGET)
          .then(() => {
            setConfirmations(TARGET);
            setStatus('confirmed');
            provider.removeAllListeners && provider.removeAllListeners('block');
          })
          .catch(() => {});

        return accelerated;
      } finally {
        setIsSpeedingUp(false);
      }
    },
    [TARGET, cleanupListener, getProvider]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setConfirmations(0);
    setTxHash('');
    setEstimatedGasLimit(null);
    setEstimatedFee(null);
    lastTxRequestRef.current = null;
    lastTxNonceRef.current = null;
    cleanupListener();
  }, [cleanupListener]);

  return {
    // state
    status,
    confirmations,
    txHash,
    estimatedGasLimit,
    estimatedFee,
    isSpeedingUp,
    // actions
    estimate,
    track,
    speedUp,
    reset,
  };
};

