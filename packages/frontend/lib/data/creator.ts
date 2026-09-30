import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/data/campaigns";

export type Payout = { id: string; date: string; campaign: string; amount: number; status: "claimed" | "pending" };
export type JoinedCampaign = { id: string; brand: string; title: string; status: Campaign["status"]; earned: number; views: number };

type JoinRow = {
  id: string;
  earned: number;
  views: number;
  campaigns: Pick<Campaign, "id" | "brand" | "title" | "status"> | null;
};

export const getJoinedCampaigns = async (creatorId: string): Promise<JoinedCampaign[]> => {
  const { data, error } = await supabase
    .from("campaign_joins")
    .select("id, earned, views, campaigns(id, brand, title, status)")
    .eq("creator_id", creatorId)
    .returns<JoinRow[]>();

  if (error || !data) {
    console.error("[getJoinedCampaigns]", error);
    return [];
  }

  return data.flatMap((r) =>
    r.campaigns
      ? [{
          id: r.campaigns.id,
          brand: r.campaigns.brand,
          title: r.campaigns.title,
          status: r.campaigns.status,
          earned: r.earned,
          views: r.views,
        }]
      : []
  );
};

// still mock — payouts table not built yet
const payouts: Payout[] = [
  { id: "p1", date: "2026-09-18", campaign: "Lumen Swap", amount: 184, status: "pending" },
  { id: "p2", date: "2026-08-30", campaign: "Vaultly", amount: 96, status: "claimed" },
];
export const getPayouts = async () => payouts;

const earnings = [
  { month: "Apr", usd: 210 }, { month: "May", usd: 340 }, { month: "Jun", usd: 480 },
  { month: "Jul", usd: 390 }, { month: "Aug", usd: 610 }, { month: "Sep", usd: 740 },
];
export const getEarningsHistory = async () => earnings;

export const getCreatorStats = async (creatorId: string) => {
  const [joined, paidOut] = await Promise.all([getJoinedCampaigns(creatorId), getPayouts()]);
  return {
    totalEarned: joined.reduce((s, c) => s + c.earned, 0),
    claimable: paidOut.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    activeCampaigns: joined.filter((c) => c.status === "live").length,
    verifiedViews: joined.reduce((s, c) => s + c.views, 0),
  };
};