import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Address, Hash } from "viem";
import { chain, ESCROW, USDC, erc20Abi, escrowAbi, publicClient, toUnits, walletClientFor } from "@/lib/chain";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const authed = (token: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

async function apiError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return new Error(body?.error ?? fallback);
}

/** approve -> createCampaign -> tell backend. Pass existingTx to retry only the backend step. */
export async function fundOnchain(opts: {
  wallet: ConnectedWallet;
  token: string;
  campaignId: string;
  budget: number;
  existingTx?: Hash;
  onStep: (label: string) => void;
  onTx: (hash: Hash) => void;
}) {
  let txHash = opts.existingTx;

  if (!txHash) {
    const units = toUnits(opts.budget);
    const account = opts.wallet.address as Address;

    const balance = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account] });
    if (balance < units) throw new Error("Not enough USDC in your wallet for this budget");

    const client = await walletClientFor(opts.wallet);

    opts.onStep("Approving USDC…");
    const approveHash = await client.writeContract({
      address: USDC, abi: erc20Abi, functionName: "approve", args: [ESCROW, units], account, chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    opts.onStep("Funding campaign…");
    txHash = await client.writeContract({
      address: ESCROW, abi: escrowAbi, functionName: "createCampaign", args: [units], account, chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    opts.onTx(txHash); // keep it so a backend failure can be retried without paying twice
  }

  opts.onStep("Verifying…");
  const res = await fetch(`${BACKEND}/v1/campaigns/${opts.campaignId}/fund`, {
    method: "POST",
    headers: authed(opts.token),
    body: JSON.stringify({ txHash }),
  });
  if (!res.ok) throw await apiError(res, "Funding verification failed");
}

export type ClaimState = {
  available: boolean;
  reason?: string;
  address?: string;
  epoch?: number;
  cumulativeAmount?: string;
  claimed?: string;
  claimable?: string;
  proof?: `0x${string}`[];
};

export async function getClaimState(token: string): Promise<ClaimState> {
  const res = await fetch(`${BACKEND}/v1/claims/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw await apiError(res, "Failed to load claim");
  return res.json();
}

export const getMinClaim = () =>
  publicClient.readContract({ address: ESCROW, abi: escrowAbi, functionName: "minClaim" });

export async function claimOnchain(wallet: ConnectedWallet, s: ClaimState) {
  const client = await walletClientFor(wallet);
  const hash = await client.writeContract({
    address: ESCROW,
    abi: escrowAbi,
    functionName: "claim",
    args: [BigInt(s.cumulativeAmount!), s.proof!],
    account: wallet.address as Address,
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getPublisherId(token: string): Promise<string | null> {
  const res = await fetch(`${BACKEND}/v1/publisher/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json()).publisherId ?? null;
}