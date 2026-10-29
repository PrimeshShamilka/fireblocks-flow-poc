import type { ReactNode } from 'react';
import s from './checkout.module.css';

export type IconName = 'alert' | 'wallet' | 'coins' | 'loader' | 'receipt' | 'pen' | 'check' | 'x';

const ICON_PATHS: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M16 13h.01" />
    </>
  ),
  coins: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.1 10.4A6 6 0 1 1 10.4 18.1" />
      <path d="M7 6h1v4" />
    </>
  ),
  loader: <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
  receipt: (
    <>
      <path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={name === 'loader' ? s.spin : undefined}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export function Hero({
  icon,
  tone = 'default',
  title,
  subtitle,
}: {
  icon: IconName;
  tone?: 'default' | 'success' | 'error';
  title: string;
  subtitle?: string;
}) {
  const toneClass = tone === 'success' ? s.heroSuccess : tone === 'error' ? s.heroError : s.heroDefault;
  return (
    <div className={s.hero}>
      <div className={s.heroText}>
        <h2 className={s.heroTitle}>{title}</h2>
        {subtitle ? <p className={s.heroSubtitle}>{subtitle}</p> : null}
      </div>
      <div className={`${s.heroIcon} ${toneClass}`}>
        <Icon name={icon} size={20} />
      </div>
    </div>
  );
}

/** Step indicator for the payment phases (1 to total). */
export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < step ? s.progressDone : s.progressTodo} />
      ))}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowValue}>{children}</span>
    </div>
  );
}

export function TokenAvatar({ symbol }: { symbol: string }) {
  return <span className={s.avatar}>{symbol.slice(0, 1)}</span>;
}

export function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}
