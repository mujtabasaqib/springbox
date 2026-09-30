"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { site } from "@/lib/site";
import SidebarNav from "@/components/SidebarNav";
import RolePicker from "@/components/RolePicker";
import { getMyRole } from "@/lib/roles";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [role, setRole] = useState<"advertiser" | "creator" | "user" | null | "loading">("loading");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authenticated) { setRole("loading"); return; }
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setRole(await getMyRole(token));
    })();
  }, [ready, authenticated, getAccessToken]);

 useEffect(() => {
  if (!role || role === "loading") return;

  if (role === "user") {
    router.replace("/rewards");
    return;
  }
  
  if (pathname === "/dashboard") {
    router.replace(role === "advertiser" ? "/dashboard/advertiser" : "/dashboard/creator");
  } else if (role === "advertiser" && pathname.startsWith("/dashboard/creator")) {
    router.replace("/dashboard/advertiser");
  } else if (role === "creator" && pathname.startsWith("/dashboard/advertiser")) {
    router.replace("/dashboard/creator");
  }
}, [role, pathname, router]);

  if (ready && !authenticated) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="display text-3xl">Sign in to continue</h1>
          <button onClick={() => login()} className="mt-6 rounded-full bg-brand-a px-6 py-3 text-sm font-semibold">Sign in</button>
        </div>
      </div>
    );
  }

  if (authenticated && role === null) {
    return <RolePicker onDone={setRole} />;
  }

  if (role === "loading") return null; // brief flash while role resolves; add a spinner if desired

  if (role === "user") {
  return null;
}


  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b border-line bg-surface p-6 md:border-b-0 md:border-r">
        <Link href="/" className="display text-2xl">{site.name}</Link>
        <SidebarNav role={role as "advertiser" | "creator"} />
      </aside>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}