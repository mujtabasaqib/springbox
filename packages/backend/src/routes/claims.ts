import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import type { Address } from 'viem';
import { syncWallet } from '../wallet';
import { publicClient, ESCROW, escrowAbi } from '../chain';
import { Router } from "express";

const router = Router();

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

export default router;