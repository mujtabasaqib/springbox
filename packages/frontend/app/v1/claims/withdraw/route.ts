import { NextResponse } from 'next/server';
import { parseAbi, parseEventLogs, type Hash } from 'viem';
import { supabase } from '@/lib/server/supabase';
import { addressFor } from '@/lib/server/addressFor';
import { publicClient } from '@/lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const transferAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);

export async function POST(req: Request) {
  const USDC = process.env.USDC_ADDRESS!;
  const address = await addressFor(req);
  if (!address) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const hash = body?.txHash as Hash;
  const r = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
  if (
    !r || r.status !== 'success' ||
    r.to?.toLowerCase() !== USDC.toLowerCase() ||
    r.from.toLowerCase() !== address.toLowerCase()
  ) return NextResponse.json({ error: 'invalid withdraw tx' }, { status: 400 });

  const log = parseEventLogs({ abi: transferAbi, eventName: 'Transfer', logs: r.logs })
    .find((l) => l.address.toLowerCase() === USDC.toLowerCase() &&
                 l.args.from.toLowerCase() === address.toLowerCase());
  if (!log) return NextResponse.json({ error: 'no transfer in tx' }, { status: 400 });

  await supabase
    .from('payouts')
    .upsert(
      { tx_hash: hash, address, amount: log.args.value.toString(), kind: 'withdraw', to_address: log.args.to },
      { onConflict: 'tx_hash', ignoreDuplicates: true },
    );
  return NextResponse.json({ ok: true });
}