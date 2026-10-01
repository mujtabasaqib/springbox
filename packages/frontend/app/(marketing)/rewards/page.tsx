"use client";
import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Section from "@/components/Section";
import ClaimButton from "@/components/ClaimButton";
import { getRewards, type RewardState } from "@/lib/rewards";

const btn = "rounded-full px-7 py-4 font-semibold transition hover:-translate-y-0.5 disabled:opacity-40";

export default function Rewards() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [s, setS] = useState<RewardState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading reward state also makes the backend join the pool and link the wallet.
  const load = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (token) setS(await getRewards(token));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
  }, [getAccessToken]);

  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);

  const pct = s ? Math.min(100, Math.round((s.views / s.unlockAt) * 100)) : 0;

  return (
    <Section tone="a">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="display text-5xl md:text-7xl">Claim your rewards.</h1>

        {!authenticated && (
          <>
            <p className="mt-6 text-lg">Claim your profile to start earning from ads.</p>
            <button disabled={!ready} onClick={() => login({ loginMethods: ["email"] })} className={`${btn} mt-10 bg-ink text-white`}>
              Claim your profile
            </button>
          </>
        )}

        {authenticated && !s && !error && <p className="mt-10">Loading…</p>}

        {s && !s.unlocked && (
          <div className="mt-10 text-left">
            <div className="h-3 rounded-full bg-ink/10"><div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} /></div>
            <p className="mt-3 flex justify-between font-mono text-sm">
              <span>{s.views.toLocaleString()} / {s.unlockAt.toLocaleString()} views</span><span>{pct}%</span>
            </p>
            <p className="mt-6 text-center">Your estimated share so far: <b className="font-mono">${s.share}</b>.</p>
          </div>
        )}

        {authenticated && s && (
  <div className="mt-10 text-left">
    <ClaimButton />
  </div>
)}

        {error && <p className="mt-6 text-red-700">{error}</p>}
      </div>
    </Section>
  );
}