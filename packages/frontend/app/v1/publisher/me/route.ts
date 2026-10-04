import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const read = () =>
    supabase.from('profiles').select('publisher_id').eq('privy_did', did).maybeSingle();

  const { data: p } = await read();
  if (!p) return NextResponse.json({ error: 'profile not found' }, { status: 404 });
  if (p.publisher_id) return NextResponse.json({ publisherId: p.publisher_id });

  await supabase
    .from('profiles')
    .update({ publisher_id: `pub_${randomBytes(6).toString('hex')}` })
    .eq('privy_did', did)
    .is('publisher_id', null);

  const { data: after } = await read();
  return NextResponse.json({ publisherId: after?.publisher_id ?? null });
}