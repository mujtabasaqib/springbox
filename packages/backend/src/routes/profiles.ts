import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import { syncWallet } from '../wallet';
import { Router } from "express";

const router = Router();

router.post('/ensure', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  const { role } = req.body;
  if (role !== 'advertiser' && role !== 'creator') {
    return res.status(400).json({ error: 'role must be advertiser or creator' });
  }

  // First-write-wins: if a profile already exists, return it unchanged.
  const { data: existing } = await supabase
    .from('profiles')
    .select('role')
    .eq('privy_did', did)
    .maybeSingle();

  if (existing) return res.json({ role: existing.role });

  const { data, error } = await supabase
    .from('profiles')
    .insert({ privy_did: did, role })
    .select('role')
    .single();

  if (error) return res.status(500).json({ error: 'failed to set role' });
  res.status(201).json({ role: data.role });
});

router.get('/me', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });
  void syncWallet(did);

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('privy_did', did)
    .maybeSingle();

  res.json({ role: data?.role ?? null });
});

export default router;