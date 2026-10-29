import 'server-only';
import { Fireblocks } from '@fireblocks/ts-sdk';
import { fireblocksConfig } from './config';

let client: Fireblocks | null = null;

function getClient(): Fireblocks {
  if (!client) {
    client = new Fireblocks({
      apiKey: fireblocksConfig.apiKey(),
      secretKey: fireblocksConfig.secretKey(),
      basePath: fireblocksConfig.basePath,
    });
  }
  return client;
}

export interface PaymentVault {
  vaultAccountId: string;
  depositAddress: string;
}

/** Fireblocks rejects idempotency keys longer than 40 characters, so drop the "ORD-" prefix (2 + 36 = 38). */
function idempotencyKey(prefix: 'v' | 'a', orderId: string): string {
  return `${prefix}-${orderId.replace(/^ORD-/, '')}`.slice(0, 40);
}

/** Creates a dedicated vault account per order and returns its deposit address for the settlement asset. */
export async function createPaymentVault(orderId: string): Promise<PaymentVault> {
  const fireblocks = getClient();
  const assetId = fireblocksConfig.assetId();

  const { data: vault } = await fireblocks.vaults.createVaultAccount({
    createVaultAccountRequest: {
      name: `KAST payment ${orderId}`,
      customerRefId: orderId,
      hiddenOnUI: false,
      autoFuel: false,
    },
    idempotencyKey: idempotencyKey('v', orderId),
  });

  if (!vault.id) {
    throw new Error('Fireblocks did not return a vault account id');
  }

  const { data: wallet } = await fireblocks.vaults.createVaultAccountAsset({
    vaultAccountId: vault.id,
    assetId,
    idempotencyKey: idempotencyKey('a', orderId),
  });

  if (!wallet.address) {
    throw new Error(`Fireblocks did not return a ${assetId} address for vault ${vault.id}`);
  }

  return { vaultAccountId: vault.id, depositAddress: wallet.address };
}
