"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function EndCampaignButton({ campaignId }: { campaignId: string }) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const end = async () => {
    if (!window.confirm("End this campaign? Ads stop serving and the unspent budget is refunded to your wallet.")) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await getAccessToken();
      const r = await fetch(`/v1/campaigns/${campaignId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "failed to end campaign");
      router.refresh(); // re-fetch the server component so the status updates
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={end}
        disabled={busy}
        className="rounded-full border border-line px-4 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {busy ? "Ending…" : "End & refund"}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  );
}