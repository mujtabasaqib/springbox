import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import { randomBytes } from 'crypto';
import { Router } from "express";

const router = Router();

router.get('/me', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  const read = () =>
    supabase.from('profiles').select('publisher_id').eq('privy_did', did).maybeSingle();

  const { data: p } = await read();
  if (!p) return res.status(404).json({ error: 'profile not found' });
  if (p.publisher_id) return res.json({ publisherId: p.publisher_id });

  await supabase
    .from('profiles')
    .update({ publisher_id: `pub_${randomBytes(6).toString('hex')}` })
    .eq('privy_did', did)
    .is('publisher_id', null);

  const { data: after } = await read();
  res.json({ publisherId: after?.publisher_id ?? null });
});

export default router;