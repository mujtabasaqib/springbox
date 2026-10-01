import 'dotenv/config';
import { type Request, type Response } from 'express';
import { supabase } from '../supabase';
import { verifyPrivyToken } from '../privyAuth';
import { syncWallet } from '../wallet';
import { ESCROW } from '../chain';
import { verifyFunding } from '../funding';
import { Router } from "express";

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const userId = await verifyPrivyToken(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const { title, category, budget, cpm, imageUrl, clickUrl, width, height } = req.body;

  if (!title || !category || !budget || !cpm || !imageUrl || !clickUrl) {
    return res.status(400).json({ error: 'missing required fields' });
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      title,
      category,
      budget,
      cpm,
      image_url: imageUrl,
      click_url: clickUrl,
      width: width ?? 300,
      height: height ?? 250,
      status: 'draft', 
      advertiser_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /v1/campaigns] supabase error', error);
    return res.status(500).json({ error: 'failed to create campaign' });
  }

  res.status(201).json({ campaign: data });
});

/*
router.post('/:id/join', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('privy_did', did)
    .maybeSingle();

  if (profile?.role !== 'creator') {
    return res.status(403).json({ error: 'only creators can join campaigns' });
  }

  const { data, error } = await supabase
    .from('campaign_joins')
    .upsert({ creator_id: did, campaign_id: req.params.id }, { onConflict: 'creator_id,campaign_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'failed to join campaign' });
  res.status(201).json({ join: data });
});
*/

router.post('/:id/fund', async (req: Request, res: Response) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.status(401).json({ error: 'unauthorized' });

  const txHash = req.body?.txHash;
  if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ error: 'invalid txHash' });
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, budget')
    .eq('id', req.params.id)
    .eq('advertiser_id', did)
    .maybeSingle();
  if (!campaign) return res.status(404).json({ error: 'campaign not found' });
  if (campaign.status !== 'draft') return res.status(409).json({ error: 'campaign is not a draft' });

  await syncWallet(did);
  const { data: profile } = await supabase
    .from('profiles').select('wallet_address').eq('privy_did', did).maybeSingle();
  if (!profile?.wallet_address) return res.status(400).json({ error: 'no wallet linked' });

  try {
    const expected = BigInt(Math.round(Number(campaign.budget) * 1_000_000)); // USDC 6 decimals
    const onchainId = await verifyFunding(txHash as `0x${string}`, profile.wallet_address, expected);

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'live',
        fund_tx_hash: txHash,
        onchain_campaign_id: onchainId.toString(),
        contract_address: ESCROW,
        chain_id: Number(process.env.CHAIN_ID),
      })
      .eq('id', campaign.id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'transaction already used' });
      console.error('[fund]', error);
      return res.status(500).json({ error: 'failed to activate campaign' });
    }
    res.json({ campaign: data });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;