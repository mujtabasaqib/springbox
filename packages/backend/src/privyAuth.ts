// packages/backend/src/privyAuth.ts
import { PrivyClient } from '@privy-io/node';

export const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export async function verifyPrivyToken(authHeader?: string) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const claims = await privy.utils().auth().verifyAuthToken(authHeader.slice(7));
    return claims.user_id; // was claims.userId — response fields are snake_case in @privy-io/node
  } catch {
    return null;
  }
}