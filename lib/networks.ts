import type { Chain } from '@dynamic-labs-sdk/client';

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
}

export interface NetworkOption {
  id: string;
  label: string;
  chainName: Chain;
  chainId: string;
  tokens: TokenOption[];
}

const EVM_NATIVE = '0x0000000000000000000000000000000000000000';
const SOL_NATIVE = '11111111111111111111111111111111';

export const NETWORKS: NetworkOption[] = [
  {
    id: 'base',
    label: 'Base',
    chainName: 'EVM',
    chainId: '8453',
    tokens: [
      { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
      { symbol: 'ETH', name: 'Ether', address: EVM_NATIVE },
    ],
  },
  {
    id: 'ethereum',
    label: 'Ethereum',
    chainName: 'EVM',
    chainId: '1',
    tokens: [
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { symbol: 'ETH', name: 'Ether', address: EVM_NATIVE },
    ],
  },
  {
    id: 'arbitrum',
    label: 'Arbitrum',
    chainName: 'EVM',
    chainId: '42161',
    tokens: [
      { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
      { symbol: 'ETH', name: 'Ether', address: EVM_NATIVE },
    ],
  },
  {
    id: 'solana',
    label: 'Solana',
    chainName: 'SOL',
    chainId: '101',
    tokens: [
      { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'SOL', name: 'Solana', address: SOL_NATIVE },
    ],
  },
];

export const SUPPORTED_WALLET_CHAINS: Chain[] = ['EVM', 'SOL'];

export function networksForChain(chain: Chain): NetworkOption[] {
  return NETWORKS.filter((n) => n.chainName === chain);
}

const EXPLORER_TX_URL: Record<string, string> = {
  '1': 'https://etherscan.io/tx/',
  '8453': 'https://basescan.org/tx/',
  '42161': 'https://arbiscan.io/tx/',
  '101': 'https://solscan.io/tx/',
};

export function explorerTxUrl(chainId: string, txHash: string): string | undefined {
  const base = EXPLORER_TX_URL[chainId];
  return base ? `${base}${encodeURIComponent(txHash)}` : undefined;
}

export function networkLabel(chainId: string): string {
  return NETWORKS.find((n) => n.chainId === chainId)?.label ?? `Chain ${chainId}`;
}

/** Formats a quote amount; SDK amounts are raw integer strings in the token's smallest unit. */
export function formatTokenAmount(raw: string, decimals?: number): string {
  if (decimals === undefined || raw.includes('.')) return raw;
  const n = BigInt(raw);
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = n / divisor;
  const remainder = n % divisor;
  if (remainder === BigInt(0)) return whole.toString();
  const frac = remainder.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 6);
  return frac ? `${whole}.${frac}` : whole.toString();
}
