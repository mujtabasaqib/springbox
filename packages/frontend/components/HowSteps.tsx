"use client";
import { useEffect, useRef, useState } from "react";

const tracks = {
  Advertiser: [
    ["Connect a wallet", "Sign in with any major wallet. No strings attached."],
    ["Fund your ad", "Set a budget and a payout. Funds go in a smart contract refund any amount that is not spent."],
    ["Creators go live", "Creators get a snippet and ads are served to audience every verified view earns."],
    ["Track and settle", "Watch verified results in real time. Unspent budget stays yours."],
  ],
  Creator: [
    ["Sign up", "Use your email to login no wallets no hassle funds are yours withdraw anytime."],
    ["Get your snippet", "Copy your snippet, customize your snippet, paste your snippet in your site and done, start earning."],
    ["Share it", "Post with your tracked link. Every view is verified."],
    ["Claim your payout", "Claim earnings to your wallet any time."],
  ],
};
type Track = keyof typeof tracks;
const colors = ["bg-brand-a", "bg-brand-b", "bg-ink", "border border-line bg-surface"];

function StepRow({ title, desc, i }: { title: string; desc: string; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.35 } // fires once ~35% of the row is in view
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <li ref={ref} className="grid items-center gap-8 py-10 md:grid-cols-[1fr_320px]">
      <div>
        <span className="font-mono text-muted">0{i + 1}</span>
        <h3 className="display mt-3 text-4xl md:text-5xl">{title}</h3>
        <p className="mt-3 max-w-md text-muted">{desc}</p>
      </div>
      <div className="flex h-44 flex-col-reverse gap-1.5">
        {colors.slice(0, i + 1).map((c, j) => (
          <div
            key={j}
            style={{ "--stagger": `${j * 120}ms`, width: `${100 - j * 8}%` } as React.CSSProperties}
            className={`h-9 self-center rounded-xl ${c} ${visible ? "stack-block" : "opacity-0"}`}
          />
        ))}
      </div>
    </li>
  );
}

export default function HowSteps() {
  const [track, setTrack] = useState<Track>("Advertiser");

  return (
    <>
      <div className="mt-10 inline-flex rounded-full border border-line bg-surface p-1">
        {(Object.keys(tracks) as Track[]).map((t) => (
          <button key={t} onClick={() => setTrack(t)} className={`rounded-full px-6 py-3 font-semibold transition ${track === t ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* key={track} remounts every row, so switching tabs re-triggers the observer */}
      <ol key={track} className="mt-12 divide-y divide-line border-y border-line">
        {tracks[track].map(([title, desc], i) => (
          <StepRow key={title} title={title} desc={desc} i={i} />
        ))}
      </ol>
    </>
  );
}
