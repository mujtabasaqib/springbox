import StatCard from "@/components/StatCard";
import StatusPill from "@/components/StatusPill";
import CreateCampaignDialog from "@/components/CreateCampaignDialog";
import FundCampaignButton from "@/components/FundCampaignButton";
import { getAdvertiserStats, getAdCampaigns } from "@/lib/data/advertiser";
import FaucetButton from "@/components/FaucetButton";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default async function AdvertiserDashboard() {
  const [stats, campaigns] = await Promise.all([getAdvertiserStats(), getAdCampaigns()]);
  const cards = [
    ["Total spend", usd(stats.spend)],
    ["Impressions", stats.impressions.toLocaleString("en-US")],
    ["Clicks", stats.clicks.toLocaleString("en-US")],
    ["Conversions", stats.conversions.toLocaleString("en-US")],
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Advertiser dashboard</h1>
        <CreateCampaignDialog />
        <FaucetButton />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-surface p-6">
        <p className="mb-4 font-medium">Campaigns</p>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-3 font-normal">Campaign</th>
              <th className="pb-3 font-normal">Status</th>
              <th className="pb-3 font-normal">Budget</th>
              <th className="pb-3 font-normal">Clicks</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {campaigns.map((c) => {
              const pct = Math.round((c.spent / c.budget) * 100);
              return (
                <tr key={c.id}>
                  <td className="py-3 font-medium">{c.title}</td>
                  <td className="py-3"><StatusPill status={c.status} /></td>
                  <td className="py-3 w-48">
                    <div className="h-2 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand-b" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1 font-mono text-xs text-muted">{usd(c.spent)} / {usd(c.budget)}</p>
                  </td>
                  <td className="py-3 font-mono">{c.clicks.toLocaleString("en-US")}</td>
                  <td className="py-3 text-right">
                    {c.status === "draft" && (
                      <FundCampaignButton campaignId={c.id} advertiserId={c.advertiserId} budget={c.budget} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}