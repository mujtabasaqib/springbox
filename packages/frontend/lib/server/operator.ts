//lib/server/operator.ts
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chain } from './chain';

export const operator = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY as Hex);
export const walletClient = createWalletClient({ account: operator, chain, transport: http() });