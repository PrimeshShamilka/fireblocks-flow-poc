import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { dynamicConfig } from '@/lib/server/config';
import { paymentStore } from '@/lib/server/payment-store';

interface FlowWebhookEvent {
  eventId: string;
  eventName: string;
  data?: {
    flowId?: string;
    newState?: string;
    previousState?: string;
    additionalData?: { settlementTxHash?: string };
  };
}

function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = Buffer.from(
    `sha256=${createHmac('sha256', dynamicConfig.webhookSecret()).update(rawBody).digest('hex')}`,
    'ascii',
  );
  const received = Buffer.from(signature, 'ascii');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get('x-dynamic-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: FlowWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!paymentStore.markEventProcessed(event.eventId)) {
    return new Response('OK', { status: 200 });
  }

  const flowId = event.data?.flowId;
  const newState = event.data?.newState;
  if (!flowId || !newState) {
    return new Response('OK', { status: 200 });
  }

  if (event.eventName === 'flow.execution.updated') {
    paymentStore.update(flowId, { executionState: newState });
  }

  if (event.eventName === 'flow.settlement.updated') {
    const payment = paymentStore.update(flowId, {
      settlementState: newState,
      settlementTxHash: event.data?.additionalData?.settlementTxHash,
    });

    if (newState === 'completed') {
      // Fulfil the order here: funds have landed in the order's Fireblocks vault.
      console.log(
        `Order ${payment?.orderId ?? 'unknown'} settled into vault ${payment?.vaultAccountId ?? 'unknown'}`,
      );
    }
  }

  if (newState === 'failed') {
    console.warn(`Flow ${flowId} failed (${event.eventName}, previous: ${event.data?.previousState})`);
  }

  return new Response('OK', { status: 200 });
}
