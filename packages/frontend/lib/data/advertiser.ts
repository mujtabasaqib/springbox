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
};

type EventStats = Record<string, { impressions: number; clicks: number }>;

const getEventStats = async (): Promise<EventStats> => {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/events/stats`);
    return r.ok ? await r.json() : {};
  } catch (e) {
    console.error("[getEventStats]", e);
    return {};
  }
};

export const getAdCampaigns = async (): Promise<AdCampaign[]> => {
  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title, status, budget, spent, advertiser_id") // removed the duplicate .select()
      .order("created_at", { ascending: false }),
    getEventStats(),
  ]);

  if (error || !data) { console.error("[getAdCampaigns]", error); return []; }
  return data.map(({ advertiser_id, ...c }) => ({
    ...c,
    advertiserId: advertiser_id,
    impressions: stats[c.id]?.impressions ?? 0,
    clicks: stats[c.id]?.clicks ?? 0,
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