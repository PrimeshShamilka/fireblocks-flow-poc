'use client';

import { useEffect, useState } from 'react';
import {
  attachFlowSource,
  cancelFlow,
  connectWithWalletProvider,
  getAvailableWalletProvidersData,
  getFlow,
  getFlowQuote,
  onEvent,
  submitFlowTransaction,
} from '@dynamic-labs-sdk/client';
import type { Flow, WalletAccount, WalletProviderData } from '@dynamic-labs-sdk/client';
import { ensureDynamicClient } from '@/lib/dynamic-client';
import {
  SUPPORTED_WALLET_CHAINS,
  formatTokenAmount,
  networksForChain,
  type NetworkOption,
  type TokenOption,
} from '@/lib/networks';
import { DEMO_ORDER_AMOUNT_USD } from '@/lib/order';
import { applyFlow, type PaymentEntry } from '@/lib/payment-history';
import type { CheckoutResponse } from '@/lib/types';
import PaymentDetails from './PaymentDetails';
import { Hero, Icon, Progress, Row, TokenAvatar, shortAddress, type IconName } from './ui';
import s from './checkout.module.css';

type Phase =
  | 'setup'
  | 'connect'
  | 'select'
  | 'preparing'
  | 'review'
  | 'signing'
  | 'confirming'
  | 'completed'
  | 'failed';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_EXECUTION_STATES = ['cancelled', 'expired', 'failed'];
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
const TOTAL_STEPS = 7;

const STEP_NUMBER: Record<Phase, number> = {
  setup: 0,
  connect: 1,
  select: 2,
  preparing: 3,
  review: 4,
  signing: 5,
  confirming: 6,
  completed: 7,
  failed: 0,
};

const HERO_ICON: Record<Phase, IconName> = {
  setup: 'alert',
  connect: 'wallet',
  select: 'coins',
  preparing: 'loader',
  review: 'receipt',
  signing: 'pen',
  confirming: 'loader',
  completed: 'check',
  failed: 'x',
};

const HERO_TITLE: Record<Phase, string> = {
  setup: 'Setup required',
  connect: 'Connect your wallet',
  select: 'Choose how to pay',
  preparing: 'Preparing your payment',
  review: 'Review your payment',
  signing: 'Confirm in your wallet',
  confirming: 'Payment in progress',
  completed: 'Payment complete',
  failed: 'Payment not completed',
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface Props {
  onPaymentSubmitted: (entry: PaymentEntry) => void;
  onFlowUpdated: (flowId: string, flow: Flow) => void;
}

export default function WalletPaymentWidget({ onPaymentSubmitted, onFlowUpdated }: Props) {
  const [phase, setPhase] = useState<Phase>(ENVIRONMENT_ID ? 'connect' : 'setup');
  const [error, setError] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [network, setNetwork] = useState<NetworkOption | null>(null);
  const [token, setToken] = useState<TokenOption | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [payment, setPayment] = useState<PaymentEntry | null>(null);
  const [signingStep, setSigningStep] = useState<'approval' | 'transaction' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const flowId = checkout?.flowId;

  // Initialise the SDK and keep the wallet list in sync as extensions discover wallets.
  useEffect(() => {
    if (!ENVIRONMENT_ID) return;
    let unsubscribe: (() => void) | undefined;
    const refresh = () =>
      setProviders(getAvailableWalletProvidersData().filter((p) => SUPPORTED_WALLET_CHAINS.includes(p.chain)));

    ensureDynamicClient()
      .then(() => {
        setClientReady(true);
        refresh();
        unsubscribe = onEvent({ event: 'walletProviderRegistered', listener: refresh });
      })
      .catch((e) => setError(`Could not initialise the wallet SDK: ${errorMessage(e)}`));

    return () => unsubscribe?.();
  }, []);

  // Step 1: connect a wallet.
  const connectWallet = async (provider: WalletProviderData) => {
    setError(null);
    setConnectingKey(provider.key);
    try {
      const account = await connectWithWalletProvider({ walletProviderKey: provider.key });
      const networks = networksForChain(account.chain);
      setWallet(account);
      setNetwork(networks[0] ?? null);
      setToken(networks[0]?.tokens[0] ?? null);
      setPhase('select');
    } catch (e) {
      setError(`Wallet connection failed: ${errorMessage(e)}`);
    } finally {
      setConnectingKey(null);
    }
  };

  // Steps 3 + 4: create the vault/flow server-side, attach the wallet as source, fetch a quote.
  const prepareQuote = async () => {
    if (!wallet || !network || !token) return;
    setError(null);
    setPhase('preparing');
    try {
      const response = await fetch('/api/checkout', { method: 'POST' });
      if (!response.ok) throw new Error(`Checkout failed with ${response.status}`);
      const created = (await response.json()) as CheckoutResponse;
      setCheckout(created);

      await attachFlowSource({
        flowId: created.flowId,
        sourceType: 'wallet',
        fromAddress: wallet.address,
        fromChainName: network.chainName,
        fromChainId: network.chainId,
      });

      setFlow(await getFlowQuote({ flowId: created.flowId, fromTokenAddress: token.address }));
      setPhase('review');
    } catch (e) {
      setCheckout(null);
      setError(`Could not prepare the payment: ${errorMessage(e)}`);
      setPhase('select');
    }
  };

  const refreshQuote = async () => {
    if (!flowId || !token) return;
    setError(null);
    try {
      setFlow(await getFlowQuote({ flowId, fromTokenAddress: token.address }));
      setPhase('review');
    } catch (e) {
      setError(`Could not refresh the quote: ${errorMessage(e)}`);
    }
  };

  const recordSubmitted = (submitted: Flow) => {
    if (!checkout || !wallet || !network || !token) return;
    const quote = submitted.quote ?? flow?.quote;
    const entry = applyFlow(
      {
        flowId: checkout.flowId,
        orderId: checkout.orderId,
        amountUsd: checkout.amountUsd,
        createdAt: Date.now(),
        walletAddress: wallet.address,
        networkLabel: network.label,
        sourceChainId: network.chainId,
        tokenSymbol: token.symbol,
        payAmount: quote ? formatTokenAmount(quote.fromAmount, quote.fromTokenInfo?.decimals) : undefined,
        vaultAccountId: checkout.vaultAccountId,
        vaultAddress: checkout.vaultAddress,
        settlementChainId: checkout.settlement.chainId,
        settlementSymbol: checkout.settlement.symbol,
        executionState: submitted.executionState,
        settlementState: submitted.settlementState,
      },
      submitted,
    );
    setFlow(submitted);
    setPayment(entry);
    onPaymentSubmitted(entry);
    setPhase('confirming');
  };

  // Step 5: prepare, switch network, sign (incl. ERC-20 approval) and broadcast.
  const signAndSubmit = async () => {
    if (!flowId || !wallet) return;
    setError(null);
    setPhase('signing');
    try {
      recordSubmitted(
        await submitFlowTransaction({ flowId, walletAccount: wallet, onStepChange: setSigningStep }),
      );
    } catch (e) {
      setError(`Transaction not submitted: ${errorMessage(e)}`);
      await recoverAfterSigningError(flowId);
    } finally {
      setSigningStep(null);
    }
  };

  // Per the SDK guidance: check state first, never blindly re-submit.
  const recoverAfterSigningError = async (id: string) => {
    try {
      const latest = await getFlow({ flowId: id });
      if (latest.executionState === 'broadcasted' || latest.executionState === 'source_confirmed') {
        setError(null);
        recordSubmitted(latest);
        return;
      }
      if (TERMINAL_EXECUTION_STATES.includes(latest.executionState)) {
        setFlow(latest);
        setPhase('failed');
        return;
      }
      // `quoted` or `signing` with nothing sent: a fresh quote returns the flow to `quoted`.
      setFlow(await getFlowQuote({ flowId: id, fromTokenAddress: token?.address }));
    } catch (e) {
      console.error(e);
    }
    setPhase('review');
  };

  const cancelPayment = async () => {
    if (flowId) {
      try {
        await cancelFlow({ flowId });
      } catch (e) {
        console.error(e);
      }
    }
    setError('Payment cancelled.');
    setPhase('failed');
  };

  const startOver = () => {
    setCheckout(null);
    setFlow(null);
    setPayment(null);
    setError(null);
    setPhase(wallet ? 'select' : 'connect');
  };

  const chooseNetwork = (next: NetworkOption) => {
    setNetwork(next);
    setToken(next.tokens[0] ?? null);
  };

  const switchWallet = () => {
    setWallet(null);
    setNetwork(null);
    setToken(null);
    setError(null);
    setPhase('connect');
  };

  // Quote expiry countdown during review.
  useEffect(() => {
    if (phase !== 'review') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Step 6: listen for on-chain confirmation and settlement into the vault.
  useEffect(() => {
    if (!flowId || phase !== 'confirming') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const latest = await getFlow({ flowId });
        if (cancelled) return;
        setFlow(latest);
        setPayment((prev) => (prev ? applyFlow(prev, latest) : prev));
        onFlowUpdated(flowId, latest);
        if (latest.settlementState === 'completed') {
          setPhase('completed');
          return;
        }
        if (latest.settlementState === 'failed' || TERMINAL_EXECUTION_STATES.includes(latest.executionState)) {
          setError(latest.failure?.message ?? `Payment ${latest.executionState === 'expired' ? 'expired' : 'failed'}.`);
          setPhase('failed');
          return;
        }
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [flowId, phase, onFlowUpdated]);

  const quote = flow?.quote;
  const quoteSecondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;
  const quoteExpired = phase === 'review' && quoteSecondsLeft === 0;
  const settlementSymbol = checkout?.settlement.symbol ?? 'USDC';
  const heroTone = phase === 'completed' ? 'success' : phase === 'failed' || phase === 'setup' ? 'error' : 'default';
  const networks = wallet ? networksForChain(wallet.chain) : [];
  const executionState = flow?.executionState;
  const settlementState = flow?.settlementState;

  const heroSubtitle: Record<Phase, string> = {
    setup: 'Set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID in .env.local and restart the server.',
    connect: `Pay $${DEMO_ORDER_AMOUNT_USD} with a wallet you already own.`,
    select: wallet ? `Connected: ${shortAddress(wallet.address)}` : '',
    preparing: 'Creating your payment session and fetching a quote.',
    review: 'Check the details below before you sign.',
    signing:
      signingStep === 'approval'
        ? 'Step 1 of 2: approve the token spend.'
        : signingStep === 'transaction'
          ? 'Step 2 of 2: sign the payment transaction.'
          : 'Preparing the transaction.',
    confirming: 'Waiting for on-chain confirmation and settlement.',
    completed: `Your payment of $${checkout?.amountUsd ?? DEMO_ORDER_AMOUNT_USD} has settled.`,
    failed: '',
  };

  return (
    <div className={s.card}>
      {phase !== 'setup' && phase !== 'failed' ? <Progress step={STEP_NUMBER[phase]} total={TOTAL_STEPS} /> : null}
      <Hero icon={HERO_ICON[phase]} tone={heroTone} title={HERO_TITLE[phase]} subtitle={heroSubtitle[phase]} />

      {error ? <div className={s.error}>{error}</div> : null}

      {phase === 'connect' ? (
        <div className={s.list}>
          {!clientReady ? <p className={s.notice}>Loading wallets...</p> : null}
          {clientReady && providers.length === 0 ? (
            <p className={s.notice}>No wallet detected. Install a browser wallet such as MetaMask or Phantom.</p>
          ) : null}
          {providers.map((provider) => (
            <button
              key={provider.key}
              type="button"
              className={s.listItem}
              disabled={connectingKey !== null}
              onClick={() => connectWallet(provider)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.walletIcon} src={provider.metadata.icon} alt="" width={36} height={36} />
              <span className={s.listItemText}>
                <span className={s.listItemTitle}>{provider.metadata.displayName}</span>
                <span className={s.listItemSub}>{provider.chain === 'SOL' ? 'Solana' : 'EVM'}</span>
              </span>
              {connectingKey === provider.key ? <Icon name="loader" size={18} /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {phase === 'select' && wallet ? (
        <>
          <div className={s.list}>
            <span className={s.sectionLabel}>Network</span>
            <div className={s.chips}>
              {networks.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`${s.chip} ${network?.id === n.id ? s.chipActive : ''}`}
                  onClick={() => chooseNetwork(n)}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
          <div className={s.list}>
            <span className={s.sectionLabel}>Pay with</span>
            {network?.tokens.map((t) => (
              <button
                key={t.address}
                type="button"
                className={`${s.listItem} ${token?.address === t.address ? s.listItemActive : ''}`}
                onClick={() => setToken(t)}
              >
                <TokenAvatar symbol={t.symbol} />
                <span className={s.listItemText}>
                  <span className={s.listItemTitle}>{t.symbol}</span>
                  <span className={s.listItemSub}>{t.name}</span>
                </span>
              </button>
            ))}
          </div>
          <div className={s.actions}>
            <button type="button" className={s.button} disabled={!network || !token} onClick={prepareQuote}>
              Get quote for ${DEMO_ORDER_AMOUNT_USD}
            </button>
            <button type="button" className={`${s.button} ${s.buttonGhost}`} onClick={switchWallet}>
              Use a different wallet
            </button>
          </div>
        </>
      ) : null}

      {phase === 'review' && quote && network && token ? (
        <>
          <div className={s.summary}>
            <Row label="You pay">
              {formatTokenAmount(quote.fromAmount, quote.fromTokenInfo?.decimals)} {token.symbol}
            </Row>
            <Row label="Network">{network.label}</Row>
            <Row label="KAST receives">
              {formatTokenAmount(quote.toAmount, quote.toTokenInfo?.decimals)} {settlementSymbol}
            </Row>
            {quote.fees?.totalFeeUsd ? <Row label="Estimated fees">${quote.fees.totalFeeUsd}</Row> : null}
            {quote.estimatedTimeSec ? (
              <Row label="Estimated time">{Math.max(1, Math.ceil(quote.estimatedTimeSec / 60))} min</Row>
            ) : null}
            <Row label="Quote expires">{quoteExpired ? 'Expired' : `${quoteSecondsLeft}s`}</Row>
          </div>
          <div className={s.actions}>
            {quoteExpired ? (
              <button type="button" className={s.button} onClick={refreshQuote}>
                Refresh quote
              </button>
            ) : (
              <button type="button" className={s.button} onClick={signAndSubmit}>
                Confirm and sign
              </button>
            )}
            {!quoteExpired ? (
              <button type="button" className={`${s.button} ${s.buttonSecondary}`} onClick={refreshQuote}>
                Refresh quote
              </button>
            ) : null}
            <button type="button" className={`${s.button} ${s.buttonGhost}`} onClick={cancelPayment}>
              Cancel payment
            </button>
          </div>
        </>
      ) : null}

      {phase === 'signing' ? (
        <div className={s.steps}>
          <div className={`${s.step} ${signingStep === 'approval' ? s.stepActive : s.stepDone}`}>
            <span className={s.stepDot}>{signingStep === 'approval' ? <Icon name="loader" size={12} /> : <Icon name="check" size={12} />}</span>
            Approve token spend (if needed)
          </div>
          <div className={`${s.step} ${signingStep === 'transaction' ? s.stepActive : ''}`}>
            <span className={s.stepDot}>{signingStep === 'transaction' ? <Icon name="loader" size={12} /> : null}</span>
            Sign payment transaction
          </div>
        </div>
      ) : null}

      {phase === 'confirming' || phase === 'completed' ? (
        <>
          <div className={s.steps}>
            <div className={`${s.step} ${s.stepDone}`}>
              <span className={s.stepDot}><Icon name="check" size={12} /></span>
              Payment submitted
            </div>
            <div className={`${s.step} ${executionState === 'source_confirmed' || phase === 'completed' ? s.stepDone : s.stepActive}`}>
              <span className={s.stepDot}>
                {executionState === 'source_confirmed' || phase === 'completed' ? <Icon name="check" size={12} /> : <Icon name="loader" size={12} />}
              </span>
              Source confirmed
            </div>
            <div className={`${s.step} ${phase === 'completed' ? s.stepDone : executionState === 'source_confirmed' ? s.stepActive : ''}`}>
              <span className={s.stepDot}>
                {phase === 'completed' ? <Icon name="check" size={12} /> : executionState === 'source_confirmed' ? <Icon name="loader" size={12} /> : null}
              </span>
              Settlement {settlementState && settlementState !== 'none' && phase !== 'completed' ? `(${settlementState})` : ''}
            </div>
          </div>
          {payment ? <PaymentDetails entry={payment} /> : null}
          {phase === 'completed' ? (
            <div className={s.actions}>
              <button type="button" className={s.button} onClick={startOver}>
                Make another payment
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {phase === 'failed' ? (
        <div className={s.actions}>
          {payment ? <PaymentDetails entry={payment} /> : null}
          <button type="button" className={s.button} onClick={startOver}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
