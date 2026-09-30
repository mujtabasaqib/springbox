"use client";
import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Hash } from "viem";
import { pickWallet, errMsg } from "@/lib/chain";
import { fundOnchain } from "@/lib/onchain";

export default function FundCampaignButton({ campaignId, advertiserId, budget }: {
  campaignId: string; advertiserId: string | null; budget: number;
}) {
  const { user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Only the owner may fund; deposits are irreversible in v1.
  if (!user || user.id !== advertiserId) return null;

  const run = async () => {
    const wallet = pickWallet(wallets);
    if (!wallet) { setError("Wallet not ready yet, try again in a moment"); return; }
    setBusy(true); setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");
      await fundOnchain({ wallet, token, campaignId, budget, existingTx: txHash, onStep: setStep, onTx: setTxHash });
      window.location.reload(); // same pattern as CreateCampaignDialog
    } catch (e) {
       setError(errMsg(e, "Claim failed"));
    } finally {
      setBusy(false); setStep("");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={busy} className="rounded-full bg-brand-a px-4 py-1.5 text-xs font-semibold disabled:opacity-50">
        {busy ? step || "Working…" : txHash ? "Retry verification" : "Fund campaign"}
      </button>
      {error && <p className="max-w-48 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}