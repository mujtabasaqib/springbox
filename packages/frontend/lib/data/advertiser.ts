//lib/data/advertiser.ts
import { supabase } from "@/lib/supabase";

export type AdCampaign = {
  id: string;
  title: string;
  status: "draft" | "live" | "paused" | "ending" | "ended" | "refunded";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  advertiserId: string | null;
  created_at: string;
  fund_tx_hash: string | null;
  refund_tx_hash: string | null;
  refunded_at: string | null;
};

export const getAdCampaigns = async (): Promise<AdCampaign[]> => {
  const [{ data, error }, { data: stats }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title, status, budget, spent, advertiser_id, created_at, fund_tx_hash, refund_tx_hash, refunded_at")
      .order("created_at", { ascending: false }),
    supabase.from("campaign_stats").select("campaign_id, impressions, clicks"),
  ]);

  if (error || !data) { console.error("[getAdCampaigns]", error); return []; }

  const totals: Record<string, { impressions: number; clicks: number }> = {};
  for (const s of stats ?? []) {
    const t = (totals[s.campaign_id] ??= { impressions: 0, clicks: 0 });
    t.impressions += s.impressions;
    t.clicks += s.clicks;
  }

  return data.map(({ advertiser_id, ...c }) => ({
    ...c,
    advertiserId: advertiser_id,
    impressions: totals[c.id]?.impressions ?? 0,
    clicks: totals[c.id]?.clicks ?? 0,
  }));
};

export const getAdvertiserStats = async () => {
  const campaigns = await getAdCampaigns();
  return {
    spend: campaigns.reduce((s, c) => s + c.spent, 0),
    impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
    clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
    conversions: 0,
  };
};