import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { settlementConfig } from '@/lib/server/config';
import { createPaymentFlow } from '@/lib/server/dynamic';
import { createPaymentVault } from '@/lib/server/fireblocks';
import { paymentStore } from '@/lib/server/payment-store';
import { DEMO_ORDER_AMOUNT_USD } from '@/lib/order';
import type { CheckoutResponse } from '@/lib/types';

export async function POST() {
  const orderId = `ORD-${randomUUID()}`;

  try {
    const vault = await createPaymentVault(orderId);

    const flow = await createPaymentFlow({
      orderId,
      amountUsd: DEMO_ORDER_AMOUNT_USD,
      destinationAddress: vault.depositAddress,
      vaultAccountId: vault.vaultAccountId,
    });

    paymentStore.save({
      orderId,
      flowId: flow.id,
      vaultAccountId: vault.vaultAccountId,
      vaultAddress: vault.depositAddress,
      amountUsd: DEMO_ORDER_AMOUNT_USD,
      executionState: flow.executionState,
      settlementState: flow.settlementState,
    });

    console.log(`Order ${orderId}: vault ${vault.vaultAccountId} (${vault.depositAddress}), flow ${flow.id}`);

    const body: CheckoutResponse = {
      orderId,
      flowId: flow.id,
      amountUsd: DEMO_ORDER_AMOUNT_USD,
      vaultAccountId: vault.vaultAccountId,
      vaultAddress: vault.depositAddress,
      settlement: { chainId: settlementConfig.chainId, symbol: settlementConfig.symbol },
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error(`Checkout failed for ${orderId}:`, error);
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 });
  }
}
