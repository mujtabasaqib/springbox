//lib/data/advertiser.ts
import { supabase } from "@/lib/supabase";

export type AdCampaign = {
  id: string;
  title: string;
  status: "draft" | "live" | "paused" | "ending" | "ended";
  budget: number;
  spent: number;
  impressions: number; // TODO: not tracked yet — needs a backend endpoint over eventLog
  clicks: number;       // TODO: same
  advertiserId: string | null;
};

export const getAdCampaigns = async (): Promise<AdCampaign[]> => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, status, budget, spent")
    .select("id, title, status, budget, spent, advertiser_id")
    .order("created_at", { ascending: false });

  if (error) { console.error("[getAdCampaigns]", error); return []; }
  return data.map(({ advertiser_id, ...c }) => ({ ...c, advertiserId: advertiser_id, impressions: 0, clicks: 0 }));
};

export const getAdvertiserStats = async () => {
  const campaigns = await getAdCampaigns();
  return {
    spend: campaigns.reduce((s, c) => s + c.spent, 0),
    impressions: 0, // TODO: sum from real event data once exposed
    clicks: 0,      // TODO: same
    conversions: 0, // TODO: same
  };
};