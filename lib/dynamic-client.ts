'use client';

import { createDynamicClient, initializeClient } from '@dynamic-labs-sdk/client';
import { addEvmExtension } from '@dynamic-labs-sdk/evm';
import { addSolanaExtension } from '@dynamic-labs-sdk/solana';

let ready: Promise<void> | null = null;

/** Creates the Dynamic client with EVM + Solana wallet support, once per browser session. */
export function ensureDynamicClient(): Promise<void> {
  if (!ready) {
    const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
    if (!environmentId) {
      return Promise.reject(new Error('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not set'));
    }
    createDynamicClient({
      autoInitialize: false,
      environmentId,
      metadata: { name: 'KAST Checkout', universalLink: window.location.origin },
    });
    // Extensions must be registered before initialisation.
    addEvmExtension();
    addSolanaExtension();
    ready = initializeClient();
  }
  return ready;
}
