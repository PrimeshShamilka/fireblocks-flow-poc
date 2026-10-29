import 'server-only';

export interface PaymentRecord {
  orderId: string;
  flowId: string;
  vaultAccountId: string;
  vaultAddress: string;
  amountUsd: string;
  executionState?: string;
  settlementState?: string;
  settlementTxHash?: string;
}

interface Store {
  payments: Map<string, PaymentRecord>;
  processedEventIds: Set<string>;
}

// In-memory only (POC). Pinned to globalThis so it survives Next.js dev hot reloads.
const globalStore = globalThis as typeof globalThis & { __kastPaymentStore?: Store };
const store: Store = (globalStore.__kastPaymentStore ??= {
  payments: new Map(),
  processedEventIds: new Set(),
});

export const paymentStore = {
  save(record: PaymentRecord) {
    store.payments.set(record.flowId, record);
  },
  get(flowId: string) {
    return store.payments.get(flowId);
  },
  update(flowId: string, patch: Partial<PaymentRecord>) {
    const existing = store.payments.get(flowId);
    if (existing) {
      store.payments.set(flowId, { ...existing, ...patch });
    }
    return store.payments.get(flowId);
  },
  /** Returns false if the event was already processed. */
  markEventProcessed(eventId: string) {
    if (store.processedEventIds.has(eventId)) return false;
    store.processedEventIds.add(eventId);
    return true;
  },
};
