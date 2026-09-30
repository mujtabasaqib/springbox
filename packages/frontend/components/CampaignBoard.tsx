"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase } from "@/lib/supabase";
import CampaignCard from "./CampaignCard";
import type { Campaign } from "@/lib/data/campaigns";

const cats: { label: string; value: string }[] = [
  { label: "All", value: "All" },
  { label: "DeFi", value: "defi" },
  { label: "Gaming", value: "gaming" },
  { label: "NFT", value: "nft" },
  { label: "Infra", value: "infra" },
];
const pill = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`;

export default function CampaignBoard({ campaigns }: { campaigns: Campaign[] }) {
  const { authenticated, user } = usePrivy();
  const userId = user?.id;

  const [cat, setCat] = useState("All");
  const [liveOnly, setLiveOnly] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  // one req for all of the user's joins, instead of one per card
  useEffect(() => {
    if (!authenticated || !userId) {
      setJoinedIds(new Set());
      return;
    }
    let cancelled = false;
    supabase
      .from("campaign_joins")
      .select("campaign_id")
      .eq("creator_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        setJoinedIds(new Set((data ?? []).map((r) => String(r.campaign_id))));
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, userId]);

  const markJoined = (id: string) =>
    setJoinedIds((prev) => new Set(prev).add(id));

  const list = campaigns.filter(
    (c) => (cat === "All" || c.category === cat) && (!liveOnly || c.status === "live")
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c.value} onClick={() => setCat(c.value)} className={pill(cat === c.value)}>
            {c.label}
          </button>
        ))}
        <button onClick={() => setLiveOnly(!liveOnly)} className={`${pill(liveOnly)} sm:ml-auto`}>
          Live only
        </button>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <CampaignCard
            key={c.id}
            c={c}
            joined={joinedIds.has(String(c.id))}
            onJoined={() => markJoined(String(c.id))}
          />
        ))}
      </div>
      {!list.length && <p className="mt-8 text-muted">No campaigns match these filters.</p>}
    </>
  );
}