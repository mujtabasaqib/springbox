"use client";
import { usePrivy } from "@privy-io/react-auth";

export default function ConnectCreator() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  return (
    <button
      disabled={!ready}
      onClick={authenticated ? logout : () => login({ loginMethods: ["email", "google"] })}
      className="rounded-full bg-brand-a px-5 py-2.5 text-sm font-semibold"
    >
      {authenticated ? (user?.email?.address ?? "Connected") : "Sign in"}
    </button>
  );
}