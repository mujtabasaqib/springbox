import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== 'advertiser' && role !== 'creator') {
    return NextResponse.json({ error: 'role must be advertiser or creator' }, { status: 400 });
  }

  // First-write-wins: if a profile already exists, return it unchanged.
  const { data: existing } = await supabase
    .from('profiles').select('role').eq('privy_did', did).maybeSingle();
  if (existing) return NextResponse.json({ role: existing.role });

  const { data, error } = await supabase
    .from('profiles').insert({ privy_did: did, role }).select('role').single();
  if (error) return NextResponse.json({ error: 'failed to set role' }, { status: 500 });
  return NextResponse.json({ role: data.role }, { status: 201 });
}