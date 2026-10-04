import { NextResponse } from 'next/server';
import type { Address, Hash } from 'viem';
import { supabase } from '@/lib/server/supabase';
import { addressFor } from '@/lib/server/addressFor';
import { publicClient, ESCROW, escrowAbi } from '@/lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const address = await addressFor(req);
  if (!address) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const hash = body?.txHash as Hash;
  const r = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
  if (
    !r || r.status !== 'success' ||
    r.to?.toLowerCase() !== ESCROW.toLowerCase() ||
    r.from.toLowerCase() !== address.toLowerCase()
  ) return NextResponse.json({ error: 'invalid claim tx' }, { status: 400 });

  const claimedAt = (blockNumber: bigint) =>
    publicClient.readContract({
      address: ESCROW, abi: escrowAbi, functionName: 'claimed',
      args: [address as Address], blockNumber,
    });
  const amount = (await claimedAt(r.blockNumber)) - (await claimedAt(r.blockNumber - 1n));
  if (amount <= 0n) return NextResponse.json({ error: 'no claim in tx' }, { status: 400 });

  await supabase
    .from('payouts')
    .upsert({ tx_hash: hash, address, amount: amount.toString() }, { onConflict: 'tx_hash', ignoreDuplicates: true });
  return NextResponse.json({ ok: true });
}