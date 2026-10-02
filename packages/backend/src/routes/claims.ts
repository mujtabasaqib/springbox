import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import type { Address } from 'viem';
import { syncWallet } from '../wallet';
import { publicClient, ESCROW, escrowAbi } from '../chain';
import { Router } from "express";
import { parseAbi, parseEventLogs, formatUnits, type Hash } from 'viem';

const router = Router();

const transferAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);
const USDC = process.env.USDC_ADDRESS!;

router.get('/me', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  await syncWallet(did);
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('privy_did', did)
    .maybeSingle();
  const address = profile?.wallet_address;
  if (!address) return res.json({ available: false, reason: 'no wallet linked' });

  const { data: row } = await supabase
    .from('claim_proofs')
    .select('epoch, cumulative_amount, proof')
    .eq('address', address)
    .order('epoch', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return res.json({ available: false, reason: 'nothing published yet' });

  const claimed = await publicClient.readContract({
    address: ESCROW,
    abi: escrowAbi,
    functionName: 'claimed',
    args: [address as Address],
  });
  const cumulative = BigInt(row.cumulative_amount);

  res.json({
    available: true,
    address,
    epoch: row.epoch,
    cumulativeAmount: cumulative.toString(),
    claimed: claimed.toString(),
    claimable: (cumulative > claimed ? cumulative - claimed : 0n).toString(),
    proof: row.proof,
  });
});

const toUsd = (v: bigint) => Number(formatUnits(v, 6));

async function addressFor(req: Request) {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return null;
  const { data } = await supabase.from('profiles').select('wallet_address').eq('privy_did', did).maybeSingle();
  return data?.wallet_address ?? null;
}

router.get('/history', async (req: Request, res: Response) => {
  const address = await addressFor(req);
  if (!address) return res.status(401).json({ error: 'unauthorized' });

  const { data: payouts } = await supabase
    .from('payouts')
    .select('tx_hash, amount, created_at, kind')
    .eq('address', address)
    .order('created_at', { ascending: false });

  res.json({
    payouts: (payouts ?? []).map((p) => ({
      id: p.tx_hash,
      date: p.created_at.slice(0, 10),
      amount: toUsd(BigInt(p.amount)),
      status: p.kind === "withdraw" ? "withdraw" : "claimed",
      kind: p.kind,
    })),
  });
});

// call after claimOnchain succeeds; verifies on-chain, never trusts the client
router.post('/record', async (req: Request, res: Response) => {
  const address = await addressFor(req);
  if (!address) return res.status(401).json({ error: 'unauthorized' });

  const hash = req.body?.txHash as Hash;
  const r = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
  if (
    !r || r.status !== 'success' ||
    r.to?.toLowerCase() !== ESCROW.toLowerCase() ||
    r.from.toLowerCase() !== address.toLowerCase()
  ) return res.status(400).json({ error: 'invalid claim tx' });

  const claimedAt = (blockNumber: bigint) =>
    publicClient.readContract({
      address: ESCROW, abi: escrowAbi, functionName: 'claimed',
      args: [address as Address], blockNumber,
    });
  const amount = (await claimedAt(r.blockNumber)) - (await claimedAt(r.blockNumber - 1n));
  if (amount <= 0n) return res.status(400).json({ error: 'no claim in tx' });

  await supabase
    .from('payouts')
    .upsert({ tx_hash: hash, address, amount: amount.toString() }, { onConflict: 'tx_hash', ignoreDuplicates: true });
  res.json({ ok: true });
});

router.post('/withdraw', async (req: Request, res: Response) => {
  const address = await addressFor(req);
  if (!address) return res.status(401).json({ error: 'unauthorized' });

  const hash = req.body?.txHash as Hash;
  const r = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
  if (
    !r || r.status !== 'success' ||
    r.to?.toLowerCase() !== USDC.toLowerCase() ||
    r.from.toLowerCase() !== address.toLowerCase()
  ) return res.status(400).json({ error: 'invalid withdraw tx' });

  const log = parseEventLogs({ abi: transferAbi, eventName: 'Transfer', logs: r.logs })
    .find((l) => l.address.toLowerCase() === USDC.toLowerCase() &&
                 l.args.from.toLowerCase() === address.toLowerCase());
  if (!log) return res.status(400).json({ error: 'no transfer in tx' });

  await supabase
    .from('payouts')
    .upsert(
      { tx_hash: hash, address, amount: log.args.value.toString(), kind: 'withdraw', to_address: log.args.to },
      { onConflict: 'tx_hash', ignoreDuplicates: true },
    );
  res.json({ ok: true });
});

export default router;