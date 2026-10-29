import 'server-only';
import { dynamicConfig, settlementConfig } from './config';

interface CreatePaymentFlowInput {
  orderId: string;
  amountUsd: string;
  destinationAddress: string;
  vaultAccountId: string;
}

interface CreatedFlow {
  id: string;
  amount: string;
  currency: string;
  executionState: string;
  settlementState: string;
}

/** Creates a Fireblocks Flow payment that settles into the given vault address. */
export async function createPaymentFlow(input: CreatePaymentFlowInput): Promise<CreatedFlow> {
  const url = `${dynamicConfig.apiBaseUrl}/server/${dynamicConfig.environmentId()}/flow/payment`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dynamicConfig.apiToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountUsd,
      currency: 'USD',
      settlementConfig: {
        strategy: 'cheapest',
        settlements: [settlementConfig],
      },
      destinationConfig: {
        destinations: [
          {
            chainName: settlementConfig.chainName,
            type: 'address',
            identifier: input.destinationAddress,
          },
        ],
      },
      memo: { orderId: input.orderId, vaultAccountId: input.vaultAccountId },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Flow creation failed (${response.status}): ${detail}`);
  }

  const { flow } = (await response.json()) as { flow: CreatedFlow };
  return flow;
}
