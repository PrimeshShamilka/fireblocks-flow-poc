'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFlow, type Flow } from '@dynamic-labs-sdk/client';
import { ensureDynamicClient } from '@/lib/dynamic-client';
import { DEMO_ORDER_AMOUNT_USD } from '@/lib/order';
import { applyFlow, isTerminal, loadHistory, saveHistory, type PaymentEntry } from '@/lib/payment-history';
import PaymentHistory from './PaymentHistory';
import WalletPaymentWidget from './WalletPaymentWidget';
import s from './checkout.module.css';

const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

export default function CheckoutApp() {
  const [history, setHistory] = useState<PaymentEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const refreshedRef = useRef(false);

  // Load persisted history after mount (localStorage is not available during SSR).
  useEffect(() => {
    setHistory(loadHistory());
    setHydrated(true);
  }, []);

  // Persist only after hydration so the first render never overwrites stored history with an empty list.
  useEffect(() => {
    if (hydrated) saveHistory(history);
  }, [history, hydrated]);

  // Once per page load, refresh any past payments that had not reached a final state.
  useEffect(() => {
    if (!hydrated || refreshedRef.current || !ENVIRONMENT_ID) return;
    refreshedRef.current = true;
    const pending = history.filter((entry) => !isTerminal(entry));
    if (pending.length === 0) return;

    ensureDynamicClient()
      .then(() =>
        Promise.all(
          pending.map(async (entry) => {
            try {
              const flow = await getFlow({ flowId: entry.flowId });
              setHistory((prev) => prev.map((e) => (e.flowId === entry.flowId ? applyFlow(e, flow) : e)));
            } catch (e) {
              console.error(e);
            }
          }),
        ),
      )
      .catch((e) => console.error(e));
  }, [hydrated, history]);

  const handlePaymentSubmitted = useCallback((entry: PaymentEntry) => {
    setHistory((prev) => [entry, ...prev.filter((e) => e.flowId !== entry.flowId)]);
  }, []);

  const handleFlowUpdated = useCallback((flowId: string, flow: Flow) => {
    setHistory((prev) => prev.map((e) => (e.flowId === flowId ? applyFlow(e, flow) : e)));
  }, []);

  return (
    <main className={s.page}>
      <div className={s.brand}>
        <span className={s.brandMark}>K</span>
        KAST Pay
      </div>
      <div className={s.shell}>
        <div className={`${s.card} ${s.orderCard}`}>
          <div>
            <div className={s.orderLabel}>Demo order</div>
            <div className={s.orderAmount}>${DEMO_ORDER_AMOUNT_USD} USD</div>
          </div>
          <div className={s.orderLabel}>Settles in USDC</div>
        </div>
        <WalletPaymentWidget onPaymentSubmitted={handlePaymentSubmitted} onFlowUpdated={handleFlowUpdated} />
        <p className={s.footnote}>
          Payments are routed by Fireblocks Flow. Rates and fees come from third-party providers and may change
          between quote and execution. On-chain transactions are final.
        </p>
        <PaymentHistory entries={history} />
      </div>
    </main>
  );
}
