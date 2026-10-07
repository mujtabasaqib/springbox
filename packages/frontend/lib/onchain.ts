import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Address, Hash } from "viem";
import { chain, ESCROW, USDC, erc20Abi, escrowAbi, publicClient, toUnits, walletClientFor, feeBuffer } from "@/lib/chain";
import { hexToNumber, slice } from "viem";

const BACKEND = "";
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

  opts.onStep("Sign to fund campaign…");
  const nonce = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "nonces", args: [account] });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

  const sig = await client.signTypedData({
    account,
    domain: { name: "USD Coin", version: "1", chainId: chain.id, verifyingContract: USDC },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner: account, spender: ESCROW, value: units, nonce, deadline },
  });

  const r = slice(sig, 0, 32);
  const s = slice(sig, 32, 64);
  let v = hexToNumber(slice(sig, 64, 65));
  if (v < 27) v += 27;

  opts.onStep("Funding campaign…");
  txHash = await client.writeContract({
    address: ESCROW, abi: escrowAbi, functionName: "createCampaignWithPermit",
    args: [units, deadline, v, r, s], account, chain,
    ...(await feeBuffer()),
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  opts.onTx(txHash);
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
    ...(await feeBuffer()),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getPublisherId(token: string): Promise<string | null> {
  const res = await fetch(`${BACKEND}/v1/publisher/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json()).publisherId ?? null;
}

export async function recordClaim(token: string, txHash: Hash) {
  await fetch(`${BACKEND}/v1/claims/record`, {
    method: "POST", headers: authed(token), body: JSON.stringify({ txHash }),
  }).catch(() => {}); // non-blocking; the history simply lags until retried
}

export async function recordWithdraw(token: string, txHash: Hash) {
  await fetch(`${BACKEND}/v1/claims/withdraw`, {
    method: "POST", headers: authed(token), body: JSON.stringify({ txHash }),
  }).catch(() => {});
}

export async function sendUsdc(wallet: ConnectedWallet, to: Address, units: bigint) {
  const client = await walletClientFor(wallet);
  const hash = await client.writeContract({
    address: USDC, abi: erc20Abi, functionName: "transfer", args: [to, units],
    account: wallet.address as Address, chain,
    ...(await feeBuffer()),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export const getUsdcBalance = (account: Address) =>
  publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account] });