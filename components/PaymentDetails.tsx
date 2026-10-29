import {
  settlementNetworkLabel,
  settlementTxUrl,
  sourceTxUrl,
  type PaymentEntry,
} from '@/lib/payment-history';
import { Row, shortAddress } from './ui';
import s from './checkout.module.css';

function TxLink({ hash, url }: { hash: string; url?: string }) {
  const label = shortAddress(hash);
  return url ? (
    <a className={s.link} href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <span className={s.mono}>{label}</span>
  );
}

export default function PaymentDetails({ entry }: { entry: PaymentEntry }) {
  return (
    <div className={s.summary}>
      <Row label="Order">
        <span className={s.mono}>{entry.orderId}</span>
      </Row>
      <Row label="Amount">${entry.amountUsd} USD</Row>
      <Row label="Paid from">
        {entry.payAmount ? `${entry.payAmount} ` : ''}
        {entry.tokenSymbol} on {entry.networkLabel}
      </Row>
      <Row label="Wallet">
        <span className={s.mono}>{shortAddress(entry.walletAddress)}</span>
      </Row>
      <Row label="Settles to">
        {entry.settlementSymbol} on {settlementNetworkLabel(entry)}
      </Row>
      <Row label="Vault">
        #{entry.vaultAccountId} <span className={s.mono}>{shortAddress(entry.vaultAddress)}</span>
      </Row>
      <Row label="Execution">{entry.executionState}</Row>
      <Row label="Settlement">{entry.settlementState}</Row>
      {entry.sourceTxHash ? (
        <Row label="Payment tx">
          <TxLink hash={entry.sourceTxHash} url={sourceTxUrl(entry)} />
        </Row>
      ) : null}
      {entry.settlementTxHash ? (
        <Row label="Settlement tx">
          <TxLink hash={entry.settlementTxHash} url={settlementTxUrl(entry)} />
        </Row>
      ) : null}
      {entry.failureMessage ? <Row label="Failure">{entry.failureMessage}</Row> : null}
    </div>
  );
}
