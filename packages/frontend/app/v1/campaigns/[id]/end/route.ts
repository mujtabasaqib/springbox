import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Atomic: only the owner, and only a live campaign, can be ended.
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', id).eq('advertiser_id', did).eq('status', 'live')
    .select().maybeSingle();

  if (error) {
    console.error('[end]', error);
    return NextResponse.json({ error: 'failed to end campaign' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'campaign not found or not live' }, { status: 409 });
  return NextResponse.json({ campaign: data }); // refund pending until next epoch run
}