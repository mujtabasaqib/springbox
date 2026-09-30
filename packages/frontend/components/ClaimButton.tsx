"use client";
import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { pickWallet, errMsg } from "@/lib/chain";
import { claimOnchain, getClaimState, getMinClaim, type ClaimState } from "@/lib/onchain";

export default function ClaimButton() {
  const { authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [state, setState] = useState<ClaimState | null>(null);
  const [minClaim, setMinClaim] = useState(0n);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (token) setState(await getClaimState(token));
  }, [getAccessToken]);

  useEffect(() => {
    if (!authenticated) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    getMinClaim().then(setMinClaim).catch(() => {});
  }, [authenticated, load]);

  if (!authenticated) return null;

  const linked = state?.address?.toLowerCase();
  //const wallet = pickWallet(wallets);
  const wallet =
  (linked && wallets.find((w) => w.address.toLowerCase() === linked)) || pickWallet(wallets);
  const claimable = BigInt(state?.claimable ?? "0");
const mismatch = !!(linked && wallet && linked !== wallet.address.toLowerCase());
  //const mismatch = !!(state?.address && wallet && state.address.toLowerCase() !== wallet.address.toLowerCase());
  const canClaim = !!state?.available && !!wallet && !mismatch && claimable > 0n && claimable >= minClaim;

  const claim = async () => {
    if (!wallet || !state) return;
     // temporary debug logging
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  console.log("embedded wallet:", embedded?.address ?? "none");
  console.log("signing wallet:", wallet.address, `(${wallet.walletClientType})`);
  console.log("linked (in tree):", state.address);
    setBusy(true); setError(null);
    try {
      await claimOnchain(wallet, state);
      await load();
    } catch (e) {
       setError(errMsg(e, "Claim failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <p className="text-sm text-muted">Claimable</p>
      <p className="display mt-1 text-3xl">${formatUnits(claimable, 6)}</p>
      <button onClick={claim} disabled={!canClaim || busy} className="mt-4 rounded-full bg-brand-a px-5 py-2 text-sm font-semibold disabled:opacity-40">
        {busy ? "Claiming…" : "Claim"}
      </button>
      {state && !state.available && <p className="mt-2 text-xs text-muted">{state.reason}</p>}
      {state?.available && claimable > 0n && claimable < minClaim && (
        <p className="mt-2 text-xs text-muted">Minimum claim is ${formatUnits(minClaim, 6)}.</p>
      )}
      {mismatch && <p className="mt-2 text-xs text-red-600">Connect your linked wallet ({state?.address?.slice(0, 6)}…{state?.address?.slice(-4)}) to claim.</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}