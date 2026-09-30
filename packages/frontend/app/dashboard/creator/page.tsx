"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import StatCard from "@/components/StatCard";
import StatusPill from "@/components/StatusPill";
import EarningsChart from "@/components/EarningsChart";
import ClaimButton from "@/components/ClaimButton";
import PublisherSnippet from "@/components/PublisherSnippet";
import { getCreatorStats, getEarningsHistory, getJoinedCampaigns, getPayouts, type JoinedCampaign, type Payout } from "@/lib/data/creator";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function CreatorDashboard() {
  const { user } = usePrivy();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCreatorStats>> | null>(null);
  const [earnings, setEarnings] = useState<Awaited<ReturnType<typeof getEarningsHistory>>>([]);
  const [joined, setJoined] = useState<JoinedCampaign[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getCreatorStats(user.id), getEarningsHistory(), getJoinedCampaigns(user.id), getPayouts()])
      .then(([s, e, j, p]) => { setStats(s); setEarnings(e); setJoined(j); setPayouts(p); setLoading(false); });
  }, [user]);

  if (loading || !stats) return <p className="text-muted">Loading…</p>;

  // "Claimable" now comes from the on-chain ClaimButton card below
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
        <ClaimButton />
      </div>

      

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EarningsChart data={earnings} />
        <div className="rounded-3xl border border-line bg-surface p-6">
          <p className="mb-4 font-medium">Joined campaigns</p>
          {joined.length === 0 ? (
            <div className="text-sm text-muted">
              <p>You haven&apos;t joined any campaigns yet.</p>
              <Link href="/#campaigns" className="mt-3 inline-block font-semibold text-ink underline">Browse live campaigns</Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {joined.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium">{c.title}</p><p className="text-muted">{c.brand}</p></div>
                  <div className="text-right"><p className="font-mono">{usd(c.earned)}</p><StatusPill status={c.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Still mock data; the fake Claim button is removed. Claiming happens in the card above. */}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-surface p-6">
        <p className="mb-4 font-medium">Payout history</p>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-muted">
            <tr><th className="pb-3 font-normal">Date</th><th className="pb-3 font-normal">Campaign</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className="py-3 font-mono text-muted">{p.date}</td>
                <td className="py-3">{p.campaign}</td>
                <td className="py-3 font-mono">{usd(p.amount)}</td>
                <td className="py-3"><StatusPill status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
       
      </div>
       <PublisherSnippet />
    </>
  );
}