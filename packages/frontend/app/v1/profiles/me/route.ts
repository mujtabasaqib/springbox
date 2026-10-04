import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';
import { syncWallet } from '@/lib/server/wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Awaited (was `void`): serverless may freeze after the response is sent.
  await syncWallet(did).catch((e) => console.error('[syncWallet]', e));

  const { data } = await supabase
    .from('profiles').select('role').eq('privy_did', did).maybeSingle();
  return NextResponse.json({ role: data?.role ?? null });
}