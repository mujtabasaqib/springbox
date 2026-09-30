"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase } from "@/lib/supabase";
import { joinCampaign } from "@/lib/joins";
import type { Campaign } from "@/lib/data/campaigns";

const dot: Record<Campaign["status"], string> = {
  draft: "bg-line", live: "bg-brand-a", paused: "bg-line", ending: "bg-brand-b", ended: "bg-line",
};
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function CampaignCard({ c }: { c: Campaign }) {
  const { authenticated, user, login, getAccessToken } = usePrivy();
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated || !user) return;
    supabase.from("campaign_joins").select("id").eq("creator_id", user.id).eq("campaign_id", c.id).maybeSingle()
      .then(({ data }) => setJoined(!!data));
  }, [authenticated, user, c.id]);

  const handleJoin = async () => {
    if (!authenticated) return login();
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (token) { await joinCampaign(token, c.id); setJoined(true); }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const pct = Math.round((c.spent / c.budget) * 100);
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 transition hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-2xl bg-ink font-display text-lg font-bold text-brand-a">{c.brand[0]}</span>
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-medium capitalize">
          <i className={`size-2 rounded-full border border-ink/10 ${dot[c.status]}`} />{c.status}
        </span>
      </div>
      <div>
        <p className="text-sm capitalize text-muted">{c.brand} · {c.category}</p>
        <h3 className="display mt-2 text-2xl">{c.title}</h3>
      </div>
      <div>
        <div className="h-2 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand-b" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 flex justify-between font-mono text-xs text-muted"><span>{usd(c.spent)} / {usd(c.budget)}</span><span>{pct}%</span></p>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <p className="font-mono text-sm text-muted"><b className="font-display text-2xl text-ink">${c.cpm}</b> / 1k views</p>
        <button
          onClick={handleJoin}
          disabled={c.status === "ended" || joined || loading}
          className="rounded-full bg-brand-a px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-white disabled:opacity-30 disabled:hover:bg-brand-a disabled:hover:text-ink"
        >
          {joined ? "Joined" : loading ? "Joining…" : "Join"}
        </button>
      </div>
    </article>
  );
}