import { supabase } from './supabase';
import { verifyPrivyToken } from './privyAuth';

export async function addressFor(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return null;
  const { data } = await supabase
    .from('profiles').select('wallet_address').eq('privy_did', did).maybeSingle();
  return data?.wallet_address ?? null;
}