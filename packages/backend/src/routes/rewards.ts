import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import { syncWallet } from '../wallet';
import { Router } from "express";

const RATE_PER_VIEW = 0.0005;   
const VIEWS_PER_MEMBER = 1000;  

const router = Router();

async function rewardState(did: string) {
  // First-write-wins: joins on first call, does nothing afterwards
  await supabase.from("profiles").upsert({ privy_did: did, role: "user" },{ onConflict: "privy_did", ignoreDuplicates: true });
  await supabase.from('reward_members').upsert({ privy_did: did }, { onConflict: 'privy_did', ignoreDuplicates: true });

  const [pool, count, me] = await Promise.all([
    supabase.from('reward_pool').select('verified_views').eq('id', 1).single(),
    supabase.from('reward_members').select('*', { count: 'exact', head: true }),
    supabase.from('reward_members').select('claimed_at, claimed_amount').eq('privy_did', did).single(),
  ]);

  const views = Number(pool.data?.verified_views ?? 0);
  const members = Math.max(1, count.count ?? 1);
  const unlockAt = VIEWS_PER_MEMBER * members;
  return {
    views,
    members,
    unlockAt,
    unlocked: views >= unlockAt,
    share: Math.round(((views * RATE_PER_VIEW) / members) * 100) / 100,
    claimed: !!me.data?.claimed_at,
    claimedAmount: me.data?.claimed_amount ?? null,
  };
}

router.get('/me', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });
  const state = await rewardState(did);
  void syncWallet(did);
  res.json(state);
});

router.post('/claim', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  const s = await rewardState(did);
  if (!s.unlocked) return res.status(403).json({ error: 'pool is still locked' });
  if (s.claimed) return res.status(409).json({ error: 'already claimed' });

  // "claimed_at is null" makes this atomic: a double-click can only succeed once
  const { data } = await supabase
    .from('reward_members')
    .update({ claimed_at: new Date().toISOString(), claimed_amount: s.share })
    .eq('privy_did', did)
    .is('claimed_at', null)
    .select();

  if (!data?.length) return res.status(409).json({ error: 'already claimed' });
  res.json({ claimed: true, amount: s.share }); // mocked: no on-chain payout yet
});

export default router;