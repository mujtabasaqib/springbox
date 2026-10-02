"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import StatCard from "@/components/StatCard";
import StatusPill from "@/components/StatusPill";
import EarningsChart from "@/components/EarningsChart";
import ClaimButton from "@/components/ClaimButton";
import PublisherSnippet from "@/components/PublisherSnippet";
import { getCreatorStats, getJoinedCampaigns, getPayouts, getViewsSeries, type JoinedCampaign, type Payout } from "@/lib/data/creator";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}`;

export default function CreatorDashboard() {
  const { user, getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCreatorStats>> | null>(null);
  const [joined, setJoined] = useState<JoinedCampaign[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  // payouts are on-chain backed; also called after a successful claim
  const refreshPayouts = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setPayouts(await getPayouts(token));
  }, [getAccessToken]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getCreatorStats(user.id), getJoinedCampaigns(user.id), refreshPayouts()])
      .then(([s, j]) => { setStats(s); setJoined(j); })
      .catch((err) => console.error("[creator dashboard]", err))
      .finally(() => setLoading(false));
  }, [user, refreshPayouts]);

  if (loading || !stats) return <p className="text-muted">Loading…</p>;

  const cards = [
    ["Total earned", usd(stats.totalEarned)],
    ["Active campaigns", String(stats.activeCampaigns)],
    ["Verified views", stats.verifiedViews.toLocaleString("en-US")],
  ];

  return (
    <>
      <h1 className="display text-4xl">Creator dashboard</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}
        <ClaimButton onClaimed={refreshPayouts} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EarningsChart data={getViewsSeries(joined)} unit="" title="Views by campaign" label="Total views" />
        <div className="rounded-3xl border border-line bg-surface p-6">
          <p className="mb-4 font-medium">Campaigns</p>
          {joined.length === 0 ? (
            <div className="text-sm text-muted">
              <p>No campaigns yet.</p>
              <Link href="/#campaigns" className="mt-3 inline-block font-semibold text-ink underline">Browse live campaigns</Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {joined.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={c.title}>{c.title}</p>
                    <p className="text-muted">{c.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{usd(c.earned)}</p>
                    <p className="font-mono text-xs text-muted">{c.views.toLocaleString("en-US")} views</p>
                    <StatusPill status={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-surface p-6">
        <p className="mb-4 font-medium">Payout history</p>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet.</p>
        ) : (
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="text-muted">
              <tr><th className="pb-3 font-normal">Date</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-mono text-muted">{p.date}</td>
                  <td className="py-3 font-mono">{usd(p.amount)}</td>
                  <td className="py-3"><StatusPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PublisherSnippet />
    </>
  );
}