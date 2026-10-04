import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';
import { syncWallet } from '@/lib/server/wallet';
import { publicClient, ESCROW, escrowAbi } from '@/lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await syncWallet(did);
  const { data: profile } = await supabase
    .from('profiles').select('wallet_address').eq('privy_did', did).maybeSingle();
  const address = profile?.wallet_address;
  if (!address) return NextResponse.json({ available: false, reason: 'no wallet linked' });

  const { data: row } = await supabase
    .from('claim_proofs').select('epoch, cumulative_amount, proof')
    .eq('address', address).order('epoch', { ascending: false }).limit(1).maybeSingle();
  if (!row) return NextResponse.json({ available: false, reason: 'nothing published yet' });

  const claimed = await publicClient.readContract({
    address: ESCROW, abi: escrowAbi, functionName: 'claimed', args: [address as Address],
  });
  const cumulative = BigInt(row.cumulative_amount);

  return NextResponse.json({
    available: true,
    address,
    epoch: row.epoch,
    cumulativeAmount: cumulative.toString(),
    claimed: claimed.toString(),
    claimable: (cumulative > claimed ? cumulative - claimed : 0n).toString(),
    proof: row.proof,
  });
}