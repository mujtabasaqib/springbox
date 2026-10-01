"use client";
import { useState } from "react";
import { Droplets } from "lucide-react";
import { getAccessToken, useWallets, usePrivy } from "@privy-io/react-auth";
import { pickWallet } from "@/lib/chain";

export default function FaucetButton() {
 // const address = pickWallet(useWallets().wallets)?.address;
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const address = (user?.email ? wallets.find(w => w.walletClientType === "privy") : pickWallet(wallets))?.address;
  
  console.log(wallets.map(w => [w.walletClientType, w.address]));
  const [label, setLabel] = useState("");
  const claim = async () => {
    setLabel("Sending…");
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getAccessToken()}` },
        body: JSON.stringify({ address }),
      });
      setLabel(r.ok ? "Funded ✓" : "Failed");
    } catch {
      setLabel("Failed");
    } finally {
      setTimeout(() => setLabel(""), 2500);
    }
  };
  return (
    <button
      title="Faucet"
      aria-label="Faucet"
      disabled={!address || label === "Sending…"}
      onClick={claim}
      className="inline-flex items-center gap-2 rounded-full bg-brand-a px-6 py-3 text-sm font-semibold disabled:opacity-50"
    >
      <Droplets className="size-4" />
      {label}
    </button>
  );
}