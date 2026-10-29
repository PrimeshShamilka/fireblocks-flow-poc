import { explorerTxUrl, networkLabel } from './networks';
import type { Flow } from '@dynamic-labs-sdk/client';

export interface PaymentEntry {
  flowId: string;
  orderId: string;
  amountUsd: string;
  createdAt: number;
  walletAddress: string;
  networkLabel: string;
  sourceChainId: string;
  tokenSymbol: string;
  payAmount?: string;
  vaultAccountId: string;
  vaultAddress: string;
  settlementChainId: string;
  settlementSymbol: string;
  executionState: string;
  settlementState: string;
  sourceTxHash?: string;
  settlementTxHash?: string;
  failureMessage?: string;
}

const STORAGE_KEY = 'kast-pay-history';
const MAX_ENTRIES = 25;
const TERMINAL_EXECUTION_STATES = ['cancelled', 'expired', 'failed'];
const TERMINAL_SETTLEMENT_STATES = ['completed', 'failed'];

export function loadHistory(): PaymentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PaymentEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: PaymentEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

/** Merges the latest flow state into a history entry. */
export function applyFlow(entry: PaymentEntry, flow: Flow): PaymentEntry {
  return {
    ...entry,
    executionState: flow.executionState,
    settlementState: flow.settlementState,
    sourceTxHash: flow.txHash ?? entry.sourceTxHash,
    settlementTxHash: flow.settlementTxHash ?? entry.settlementTxHash,
    failureMessage: flow.failure?.message ?? entry.failureMessage,
  };
}

export function isTerminal(entry: Pick<PaymentEntry, 'executionState' | 'settlementState'>): boolean {
  return (
    TERMINAL_EXECUTION_STATES.includes(entry.executionState) ||
    TERMINAL_SETTLEMENT_STATES.includes(entry.settlementState)
  );
}

export type PaymentStatus = 'completed' | 'failed' | 'pending';

export function paymentStatus(entry: Pick<PaymentEntry, 'executionState' | 'settlementState'>): PaymentStatus {
  if (entry.settlementState === 'completed') return 'completed';
  if (entry.settlementState === 'failed' || TERMINAL_EXECUTION_STATES.includes(entry.executionState)) return 'failed';
  return 'pending';
}

export function sourceTxUrl(entry: PaymentEntry): string | undefined {
  return entry.sourceTxHash ? explorerTxUrl(entry.sourceChainId, entry.sourceTxHash) : undefined;
}

export function settlementTxUrl(entry: PaymentEntry): string | undefined {
  return entry.settlementTxHash ? explorerTxUrl(entry.settlementChainId, entry.settlementTxHash) : undefined;
}

export function settlementNetworkLabel(entry: PaymentEntry): string {
  return networkLabel(entry.settlementChainId);
}
