import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: mine } = await supabase
    .from('campaigns').select('id').eq('advertiser_id', did);
  const ids = (mine ?? []).map((c) => c.id);
  if (!ids.length) return NextResponse.json({});

  const { data: rows } = await supabase
    .from('campaign_stats').select('campaign_id, impressions, clicks')
    .in('campaign_id', ids);

  const out: Record<string, { impressions: number; clicks: number }> = {};
  for (const r of rows ?? []) {
    const t = (out[r.campaign_id] ??= { impressions: 0, clicks: 0 });
    t.impressions += r.impressions;
    t.clicks += r.clicks;
  }
  return NextResponse.json(out);
}