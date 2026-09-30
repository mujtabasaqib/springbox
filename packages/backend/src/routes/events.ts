import 'dotenv/config';
import { type Request, type Response } from 'express';
import { verifyToken } from '../token';
import type { EventBody } from '../types';
import { supabase } from '../supabase';

const MIN_DWELL_MS = 900;
const MAX_FOCUS_RATIO_SLACK = 1.05;

import { Router } from "express";

const router = Router();

// In-memory log, replace with a real DB. 
const eventLog: (EventBody & { verified: boolean })[] = [];

router.post('/', (req: Request<{}, {}, EventBody>, res: Response) => {
  const body = req.body;

  if (!body?.type || !body.token || !body.publisherId || !body.slotId) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const { valid, adId } = verifyToken(body.token, body.publisherId, body.slotId);
  if (!valid || adId !== body.adId) {
    console.warn('[events] rejected invalid/forged token', body);
    return res.status(403).json({ error: 'invalid token' });
  }

  if (body.type === 'impression') {
    const dwellOk = (body.dwellMs ?? 0) >= MIN_DWELL_MS;
    const focusOk = (body.focusRatio ?? 0) <= MAX_FOCUS_RATIO_SLACK;
    if (!dwellOk || !focusOk) {
      console.warn('[events] rejected: implausible dwell/focus', {
        dwellMs: body.dwellMs,
        focusRatio: body.focusRatio,
      });
      return res.status(403).json({ error: 'implausible view signal' });
    }
  }

  eventLog.push({ ...body, verified: true });
//  if (body.type === 'impression') {
 // void supabase.rpc('increment_pool_views', { n: 1 }).then(({ error }) => error && console.error('[pool]', error));
//}

  if (body.type === 'impression') {
  void supabase.rpc('increment_pool_views', { n: 1 })
    .then(({ error }) => error && console.error('[pool]', error));
  // use adId from the verified token, not body.campaignId (which is unverified)
  void supabase.rpc('credit_impression', { p_publisher: body.publisherId, p_campaign: adId })
    .then(({ error }) => error && console.error('[credit]', error));
}

  console.log(`[events] ${body.type} ✓`, body.adId, body.publisherId, body.slotId);
  res.sendStatus(200);
});

router.get('/debug', (_req: Request, res: Response) => {
  res.json({ count: eventLog.length, events: eventLog });
});


export default router;