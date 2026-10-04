import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';
import { syncWallet } from '@/lib/server/wallet';
import { ESCROW } from '@/lib/server/chain';
import { verifyFunding } from '@/lib/server/funding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const txHash = body?.txHash;
  if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'invalid txHash' }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from('campaigns').select('id, status, budget')
    .eq('id', id).eq('advertiser_id', did).maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 });
  if (campaign.status !== 'draft') return NextResponse.json({ error: 'campaign is not a draft' }, { status: 409 });

  await syncWallet(did);
  const { data: profile } = await supabase
    .from('profiles').select('wallet_address').eq('privy_did', did).maybeSingle();
  if (!profile?.wallet_address) return NextResponse.json({ error: 'no wallet linked' }, { status: 400 });

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
      if (error.code === '23505') return NextResponse.json({ error: 'transaction already used' }, { status: 409 });
      console.error('[fund]', error);
      return NextResponse.json({ error: 'failed to activate campaign' }, { status: 500 });
    }
    return NextResponse.json({ campaign: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}