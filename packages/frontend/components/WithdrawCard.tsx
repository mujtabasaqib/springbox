"use client";
import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits, isAddress, parseEther, parseUnits, type Address } from "viem";
import { pickWallet, errMsg, publicClient } from "@/lib/chain";
import { getClaimState, getUsdcBalance, sendUsdc, recordWithdraw } from "@/lib/onchain";
import FaucetButton from "@/components/FaucetButton";

const LOW_GAS = parseEther("0.0005");
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (units: bigint) =>
  `$${Number(formatUnits(units, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WithdrawCard({ refreshKey = 0, onSent }: { refreshKey?: number; onSent?: () => void }) {
  const { authenticated, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();

  // undefined = still loading, null = backend has no linked address
  const [linked, setLinked] = useState<string | null | undefined>(undefined);
  const [usdc, setUsdc] = useState(0n);
  const [eth, setEth] = useState<bigint | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  // Same wallet resolution as ClaimButton
  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      const token = await getAccessToken();
      if (!token) return setLinked(null);
      setLinked((await getClaimState(token)).address ?? null);
    })().catch(() => setLinked(null));
  }, [authenticated, getAccessToken]);

  const fallback = user?.email
  ? wallets.find((w) => w.walletClientType === "privy")
  : pickWallet(wallets);

const wallet =
  linked === undefined ? undefined
  : linked ? wallets.find((w) => w.address.toLowerCase() === linked.toLowerCase())
  : fallback;
  const address = wallet?.address as Address | undefined;

  const refresh = useCallback(async () => {
    if (!address) return;
    const [u, e] = await Promise.all([getUsdcBalance(address), publicClient.getBalance({ address })]);
    setUsdc(u); setEth(e);
  }, [address]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh, refreshKey]);

  if (!authenticated || linked === undefined) return null;

  if (!wallet) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6">
        <p className="font-medium">Withdraw</p>
        <p className="mt-2 text-xs text-red-600">
          {linked ? `Connect your linked wallet (${short(linked)}) to withdraw.` : "No wallet available."}
        </p>
      </div>
    );
  }

  let units = 0n;
  try { units = amount ? parseUnits(amount, 6) : 0n; } catch {}
  const overBalance = units > usdc;
  const valid = isAddress(to) && units > 0n && !overBalance;
  const lowGas = eth !== null && eth < LOW_GAS;

  const send = async () => {
    if (!confirming) return setConfirming(true);
    setBusy(true); setError(null); setTx(null);
    try {
      const hash = await sendUsdc(wallet, to as Address, units);
setTx(hash);
setAmount(""); setTo("");         
const token = await getAccessToken();
if (token) await recordWithdraw(token, hash);
await refresh();                  
onSent?.();
    } catch (e) {
      setError(errMsg(e, "Send failed"));
    } finally {
      setBusy(false); setConfirming(false);
    }
  };

  const input = "w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <p className="text-sm text-muted">Wallet balance</p>
      <p className="display mt-1 text-3xl">{fmt(usdc)}</p>
      <p className="mt-1 font-mono text-xs text-muted" title={wallet.address}>{short(wallet.address)}</p>

      <div className="mt-5 space-y-2">
        <input
          value={to} onChange={(e) => { setTo(e.target.value.trim()); setConfirming(false); }}
          placeholder="Destination address (0x…)" className={`${input} font-mono`}
        />
        <div className="relative">
          <input
            value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}
            placeholder="Amount (USDC)" inputMode="decimal" className={`${input} pr-14`}
          />
          <button
            type="button" onClick={() => { setAmount(formatUnits(usdc, 6)); setConfirming(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
          >
            Max
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={send} disabled={!valid || busy}
          className="rounded-full bg-brand-a px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Sending…" : confirming ? `Confirm ${fmt(units)} to ${short(to)}` : "Send"}
        </button>
        {confirming && !busy && (
          <button onClick={() => setConfirming(false)} className="text-xs text-muted underline">Cancel</button>
        )}
      </div>

      {to && !isAddress(to) && <p className="mt-2 text-xs text-red-600">Invalid address.</p>}
      {overBalance && <p className="mt-2 text-xs text-red-600">Amount exceeds balance.</p>}
      {tx && <p className="mt-2 text-xs text-muted">Sent. Tx {tx.slice(0, 10)}…{tx.slice(-6)}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}