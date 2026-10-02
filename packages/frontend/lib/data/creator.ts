import { formatUnits } from "viem";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/data/campaigns";
import { getClaimState } from "@/lib/onchain";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export type Payout = { id: string; date: string; amount: number; status: "claimed" | "pending" };
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

// ---- payouts (on-chain backed) ----
const getPayoutHistory = async (token: string): Promise<Payout[]> => {
  const res = await fetch(`${BACKEND}/v1/claims/history`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return (await res.json()).payouts ?? [];
};

export const getPayouts = async (token: string): Promise<Payout[]> => {
  const [claimed, s] = await Promise.all([getPayoutHistory(token), getClaimState(token).catch(() => null)]);
  const claimable = s?.available ? BigInt(s.claimable ?? "0") : 0n;
  const pending: Payout[] = claimable > 0n
    ? [{ id: "pending", date: new Date().toISOString().slice(0, 10), amount: Number(formatUnits(claimable, 6)), status: "pending" }]
    : [];
  return [...pending, ...claimed];
};


export const getViewsSeries = (joined: JoinedCampaign[]) => {
  const short = (s: string) => (s.length > 10 ? `${s.slice(0, 9)}` : s);
  let running = 0;
  const points = [...joined]
    .sort((a, b) => a.views - b.views)
    .map((c) => ({ month: short(c.title), usd: (running += c.views) }));
  return [{ month: "Start", usd: 0 }, ...points];
};

export const getCreatorStats = async (creatorId: string) => {
  const joined = await getJoinedCampaigns(creatorId);
  return {
    totalEarned: joined.reduce((s, c) => s + c.earned, 0),
    activeCampaigns: joined.filter((c) => c.status === "live").length,
    verifiedViews: joined.reduce((s, c) => s + c.views, 0),
  };
};