import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function withApiVersion(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export const fireblocksConfig = {
  apiKey: () => required('FIREBLOCKS_API_KEY'),
  // PEM private key contents; literal "\n" sequences (single-line env values) are expanded.
  secretKey: () => required('FIREBLOCKS_SECRET_KEY').replace(/\\n/g, '\n'),
  // The SDK does not add the API version itself, so make sure the base path ends with /v1.
  basePath: withApiVersion(process.env.FIREBLOCKS_BASE_PATH || 'https://sandbox-api.fireblocks.io/v1'),
  // Must be the Fireblocks asset that matches the settlement chain/token below.
  assetId: () => required('FIREBLOCKS_ASSET_ID'),
};

export const dynamicConfig = {
  apiBaseUrl: process.env.DYNAMIC_API_BASE_URL || 'https://app.dynamicauth.com/api/v0',
  apiToken: () => required('DYNAMIC_API_TOKEN'),
  environmentId: () => required('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID'),
  webhookSecret: () => required('DYNAMIC_WEBHOOK_SECRET'),
};

export const settlementConfig = {
  chainName: 'EVM' as const,
  chainId: process.env.SETTLEMENT_CHAIN_ID || '8453',
  tokenAddress: process.env.SETTLEMENT_TOKEN_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  symbol: process.env.SETTLEMENT_TOKEN_SYMBOL || 'USDC',
  tokenDecimals: Number(process.env.SETTLEMENT_TOKEN_DECIMALS || '6'),
};
