import 'dotenv/config';
import { Router } from "express";
import { type Request, type Response } from 'express';
import { pickAd } from '../mockAds';
import { signToken } from '../token';
import type { AdRequestBody } from '../types';

const router = Router();

router.post('/request',  async (req: Request<{}, {}, AdRequestBody>, res: Response) => {
  const { publisherId, slotId } = req.body;
  if (!publisherId || !slotId) {
    return res.status(400).json({ error: 'publisherId and slotId are required' });
  }

  const ad = await pickAd();
  if (!ad) return res.sendStatus(204); // no fill

  const token = signToken(ad.adId, publisherId, slotId);
  res.json({ ad: { ...ad, token } });
});

export default router;