import Link from "next/link";
import Section from "@/components/Section";
import StackIllustration from "@/components/StackIllustration";
import CampaignBoard from "@/components/CampaignBoard";
import Faq from "@/components/Faq";
import { getCampaigns } from "@/lib/data/campaigns";

export const revalidate = 60;

const btn = "rounded-full px-7 py-4 font-semibold transition hover:-translate-y-0.5";
const stats = [["$4.2k", "paid to creators"], ["110", "active creators"], ["32", "live campaigns"]];
const steps = [
  ["Fund", "Advertisers spend per view any cent not spent goes back to you"],
  ["Join", "Creators paste a snippet and start earning"],
  ["Earn", "Verified views trigger automatic payouts"],
];

export default async function Home() {
  const campaigns = await getCampaigns();

  return (
    <>
      <Section>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h1 className="display text-6xl md:text-7xl xl:text-[5.5rem]">Ads that work for you, <br/>on-chain.</h1>
            <p className="mt-6 max-w-md text-lg text-muted">
              Sponsors fund campaigns. Creators join and earn. Every payout is transparent and settled automatically.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/dashboard/creator" className={`${btn} bg-brand-a`}>Start earning</Link>
              <Link href="/dashboard/advertiser" className={`${btn} border border-ink`}>Launch a campaign</Link>
            </div>
          </div>
          <StackIllustration />
        </div>
      </Section>

      <Section tone="a">
        <div className="grid gap-10 md:grid-cols-3">
          {stats.map(([n, l]) => (
            <div key={l}>
              <p className="display text-6xl md:text-7xl">{n}</p>
              <p className="mt-2 font-medium">{l}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="campaigns">
        <h2 className="display text-5xl md:text-6xl">Live campaigns</h2>
        <p className="mb-10 mt-4 max-w-md text-muted">Payouts are per verified views.</p>
        <CampaignBoard campaigns={campaigns} />
      </Section>

      <Section tone="b">
        <h2 className="display max-w-2xl text-5xl md:text-6xl">Three steps. No middlemen.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <div key={t} className="rounded-3xl bg-white/10 p-8">
              <span className="font-mono text-white/60">0{i + 1}</span>
              <h3 className="display mt-6 text-3xl">{t}</h3>
              <p className="mt-2 text-white/70">{d}</p>
            </div>
          ))}
        </div>
        <Link href="/how-it-works" className={`${btn} mt-10 inline-block bg-white text-ink`}>See the full flow</Link>
      </Section>

      <Section>
        <h2 className="display text-5xl md:text-6xl">Questions, answered</h2>
        <div className="mt-10 max-w-3xl"><Faq /></div>
      </Section>

      <Section tone="a">
        <div className="text-center">
          <h2 className="display mx-auto max-w-3xl text-5xl md:text-7xl">Ready to stack your first campaign?</h2>
          <Link href="/dashboard/advertiser" className={`${btn} mt-10 inline-block bg-ink text-white`}>Get started</Link>
        </div>
      </Section>
    </>
  );
}