"use client";
import { useState } from "react";
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
  const [cat, setCat] = useState("All");
  const [liveOnly, setLiveOnly] = useState(false);

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
          <CampaignCard key={c.id} c={c} />
        ))}
      </div>
      {!list.length && <p className="mt-8 text-muted">No campaigns match these filters.</p>}
    </>
  );
}