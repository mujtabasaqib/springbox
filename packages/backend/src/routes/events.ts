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

const seen = new Map<string, number>(); // nonce -> expiry
let poolPending = 0;

setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of seen) if (exp < now) seen.delete(k);
  if (poolPending > 0) {
    const n = poolPending; poolPending = 0;
    void supabase.rpc('increment_pool_views', { n }).then(({ error }) => {
      if (error) { console.error('[pool]', error); poolPending += n; }
    });
  }
}, 3000).unref();

router.post('/', (req: Request<{}, {}, EventBody>, res: Response) => {
  const body = req.body;

  if (!body?.type || !body.token || !body.publisherId || !body.slotId) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const { valid, adId, nonce, exp } = verifyToken(body.token, body.publisherId, body.slotId);
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

    if (seen.has(nonce!)) return res.status(409).json({ error: 'token already used' });
    seen.set(nonce!, exp!);
    poolPending++;
  }

  eventLog.push({ ...body, verified: true });
//  if (body.type === 'impression') {
 // void supabase.rpc('increment_pool_views', { n: 1 }).then(({ error }) => error && console.error('[pool]', error));
//}

  if (body.type === 'impression') {
  //void supabase.rpc('increment_pool_views', { n: 1 })
   // .then(({ error }) => error && console.error('[pool]', error));
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

router.get('/stats', (_req: Request, res: Response) => {
  const out: Record<string, { impressions: number; clicks: number }> = {};
  for (const e of eventLog) {
    const s = (out[e.adId] ??= { impressions: 0, clicks: 0 });
    if (e.type === 'impression') s.impressions++;
    else if (e.type === 'click') s.clicks++;
  }
  res.json(out);
});


export default router;