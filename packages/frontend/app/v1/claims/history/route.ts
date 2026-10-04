import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { supabase } from '@/lib/server/supabase';
import { addressFor } from '@/lib/server/addressFor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const toUsd = (v: bigint) => Number(formatUnits(v, 6));

export async function GET(req: Request) {
  const address = await addressFor(req);
  if (!address) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: payouts } = await supabase
    .from('payouts').select('tx_hash, amount, created_at, kind')
    .eq('address', address).order('created_at', { ascending: false });

  return NextResponse.json({
    payouts: (payouts ?? []).map((p) => ({
      id: p.tx_hash,
      date: p.created_at.slice(0, 10),
      amount: toUsd(BigInt(p.amount)),
      status: p.kind === 'withdraw' ? 'withdraw' : 'claimed',
      kind: p.kind,
    })),
  });
}