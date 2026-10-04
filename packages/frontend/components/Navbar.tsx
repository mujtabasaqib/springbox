//components/Navbar.tsx
"use client";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { site } from "@/lib/site";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function Logo() {
  return (
    <span aria-hidden className="relative inline-block h-7 w-6">
      <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rotate-12 bg-black" />
      <span className="absolute left-1/2 top-[12px] h-[2px] w-4 -translate-x-1/2 bg-black" />
      <span className="absolute left-1/2 top-[14px] h-[12px] w-3 -translate-x-1/2 bg-black [clip-path:polygon(0_0,100%_22%,0_44%,100%_66%,0_88%,0_100%,100%_78%,0_56%,100%_34%,0_12%)]" />
      <span className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 bg-black" />
    </span>
  );
}

export default function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;
  const links = site.links.map(([t, h]) => (
    <Link key={h} href={h} className="hover:text-muted">{t}</Link>
  ));

  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(authenticated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasAuthenticated.current && authenticated) {
      router.push("/dashboard");
    }
    wasAuthenticated.current = authenticated;
  }, [authenticated, router, pathname]);

   useEffect(() => {
    setOpen(false);
  }, [pathname]);


  return (
    <div className="sticky top-0 z-50 p-4">
      <header className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-line bg-surface py-2 pl-6 pr-2">
        <Link href="/" className="display flex items-center gap-1 text-2xl leading-none">
          <Logo />
          <span className="-translate-y-[0.5px]">{site.name}</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium md:flex">{links}</nav>
        <div className="flex items-center gap-2">
          <div className="relative md:hidden">
  <button
    aria-label="Toggle menu"
    aria-expanded={open}
    onClick={() => setOpen((o) => !o)}
    className="flex h-10 w-10 flex-col items-center justify-center gap-[5px]"
  >
    <span className={`h-[2px] w-5 bg-black transition ${open ? "translate-y-[7px] rotate-45" : ""}`} />
    <span className={`h-[2px] w-5 bg-black transition ${open ? "opacity-0" : ""}`} />
    <span className={`h-[2px] w-5 bg-black transition ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
  </button>

  {open && (
    <nav
      onClick={() => setOpen(false)}
      className="absolute right-0 top-12 flex w-52 flex-col gap-3 rounded-2xl border border-line bg-surface p-5 text-sm font-medium"
    >
      {links}
    </nav>
  )}
</div>
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
