import {
  createPublicClient, createWalletClient, custom, defineChain, http, parseAbi, type Address,
} from "viem";
import type { ConnectedWallet } from "@privy-io/react-auth";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
export const ESCROW = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address;
export const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;

export const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 421614 ? "Arbitrum Sepolia" : "Configured chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] } },
});

export const publicClient = createPublicClient({ chain, transport: http() });

export const escrowAbi = parseAbi([
  "function createCampaign(uint256 budget) returns (uint256)",
  "function claim(uint256 cumulativeAmount, bytes32[] proof)",
  "function minClaim() view returns (uint256)",
]);
export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

// Must match the backend's conversion exactly (USDC has 6 decimals).
export const toUnits = (usdc: number) => BigInt(Math.round(usdc * 1_000_000));

// The backend links the embedded wallet, so the frontend must sign with the same one.
export const pickWallet = (wallets: ConnectedWallet[]) =>
  wallets.find((w) => w.walletClientType !== "privy") ??
  wallets.find((w) => w.walletClientType === "privy");

export async function walletClientFor(wallet: ConnectedWallet) {
  await wallet.switchChain(CHAIN_ID);
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ account: wallet.address as Address, chain, transport: custom(provider) });
}

export function errMsg(e: unknown, fallback = "Transaction failed") {
  const err = e as { code?: number; name?: string; shortMessage?: string; message?: string; cause?: { code?: number } };
  const rejected =
    err.code === 4001 ||
    err.cause?.code === 4001 ||
    err.name === "UserRejectedRequestError" ||
    /user rejected|user denied/i.test(err.message ?? "");
  if (rejected) return "Transaction cancelled";
  if (err.shortMessage) return err.shortMessage;
  return (err.message ?? fallback).split("\n")[0].slice(0, 120);
}

export async function feeBuffer() {
  const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
  return { maxFeePerGas: maxFeePerGas * 2n, maxPriorityFeePerGas };
}