import { paymentStatus, type PaymentEntry } from '@/lib/payment-history';
import PaymentDetails from './PaymentDetails';
import s from './checkout.module.css';

const BADGE_CLASS = {
  completed: s.badgeCompleted,
  failed: s.badgeFailed,
  pending: s.badgePending,
} as const;

const BADGE_LABEL = { completed: 'Completed', failed: 'Failed', pending: 'In progress' } as const;

export default function PaymentHistory({ entries }: { entries: PaymentEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className={s.card}>
      <h3 className={s.historyTitle}>Payment history</h3>
      <div className={s.list}>
        {entries.map((entry) => {
          const status = paymentStatus(entry);
          return (
            <details key={entry.flowId} className={s.historyDetails}>
              <summary>
                <span className={s.listItemText}>
                  <span className={s.listItemTitle}>${entry.amountUsd}</span>
                  <span className={s.listItemSub}>
                    {entry.tokenSymbol} on {entry.networkLabel} · {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </span>
                <span className={`${s.badge} ${BADGE_CLASS[status]}`}>{BADGE_LABEL[status]}</span>
              </summary>
              <div className={s.historyBody}>
                <PaymentDetails entry={entry} />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
