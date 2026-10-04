import { privy } from './privyAuth';
import { supabase } from './supabase';

async function fetchWalletAddress(did: string): Promise<string | null> {
  // Method name differs across @privy-io/node versions (`_get` in early ones, `get` later).
  const users: any = privy.users();
  const user = await (users._get ?? users.get).call(users, did);

  const wallets = (user.linked_accounts ?? []).filter(
    (a: any) => a.type === 'wallet' && (a.chain_type ?? 'ethereum') === 'ethereum'
  );

  const external = wallets.find((w: any) => w.wallet_client_type !== 'privy');
  const embedded = wallets.find((w: any) => w.wallet_client_type === 'privy');
  const address = (external ?? embedded ?? wallets[0])?.address;
  return address ? String(address).toLowerCase() : null;
}

/** Stores profiles.wallet_address once. Safe to call on every authed request. */
export async function syncWallet(did: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('privy_did', did)
      .maybeSingle();
    if (!data || data.wallet_address) return;

    const address = await fetchWalletAddress(did);
    if (!address) return;

    const { error } = await supabase
      .from('profiles')
      .update({ wallet_address: address })
      .eq('privy_did', did)
      .is('wallet_address', null);
    if (error) console.error('[wallet sync]', error.message);
  } catch (e) {
    console.error('[wallet sync] failed', e);
  }
}