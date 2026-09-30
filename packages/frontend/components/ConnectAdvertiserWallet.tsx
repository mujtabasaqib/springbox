"use client";
import { usePrivy } from "@privy-io/react-auth";

export default function ConnectAdvertiserWallet() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;

  return (
    <button
      disabled={!ready}
      onClick={authenticated ? logout : () => login({ loginMethods: ["wallet"] })}
      className="rounded-full bg-brand-a px-5 py-2.5 text-sm font-semibold"
    >
      {authenticated ? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected") : "Connect wallet"}
    </button>
  );
}