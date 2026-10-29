export interface CheckoutResponse {
  orderId: string;
  flowId: string;
  amountUsd: string;
  vaultAccountId: string;
  vaultAddress: string;
  settlement: { chainId: string; symbol: string };
}
