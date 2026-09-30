//components/Navbar.tsx
"use client";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { site } from "@/lib/site";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;
  const links = site.links.map(([t, h]) => (
    <Link key={h} href={h} className="hover:text-muted">{t}</Link>
  ));

  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(authenticated);

  useEffect(() => {
    if (!wasAuthenticated.current && authenticated && pathname !== "/rewards") {
      router.push("/dashboard");
    }
    wasAuthenticated.current = authenticated;
  }, [authenticated, router, pathname]);


  return (
    <div className="sticky top-0 z-50 p-4">
      <header className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-line bg-surface py-2 pl-6 pr-2">
        <Link href="/" className="display text-2xl">{site.name}</Link>
        <nav className="hidden gap-6 text-sm font-medium md:flex">{links}</nav>
        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Menu</summary>
            <nav className="absolute right-0 top-10 flex w-52 flex-col gap-3 rounded-2xl border border-line bg-surface p-5 text-sm font-medium">{links}</nav>
          </details>
          <button
            disabled={!ready}
            onClick={authenticated ? logout : () => login()}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${authenticated ? "bg-ink font-mono text-white" : "bg-brand-a text-ink"}`}
          >
            {authenticated ? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected") : "Connect"}
          </button>
        </div>
      </header>
    </div>
  );
}