//lib/data/campaigns.ts
import { supabase } from "@/lib/supabase";

export type Campaign = {
  id: string;
  brand: string;
  title: string;
  category: "defi" | "gaming" | "nft" | "infra";
  status: "draft" | "live" | "paused" | "ending" | "ended";
  cpm: number;
  budget: number;
  spent: number;
};

export const getCampaigns = async (): Promise<Campaign[]> => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, brand, title, category, status, cpm, budget, spent")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  if (error) { console.error("[getCampaigns]", error); return []; }
  return data;
};

export const getCampaign = async (id: string): Promise<Campaign | undefined> => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, brand, title, category, status, cpm, budget, spent")
    .eq("id", id)
    .single();

  if (error) { console.error("[getCampaign]", error); return undefined; }
  return data ?? undefined;
};