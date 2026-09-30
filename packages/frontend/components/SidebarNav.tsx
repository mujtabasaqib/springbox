//components/SidebarNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = { creator: ["Creator", "/dashboard/creator"], advertiser: ["Advertiser", "/dashboard/advertiser"], user: ["User", "/dashboard/user"] } as const;

export default function SidebarNav({ role }: { role: "advertiser" | "creator" | "user" }) {
  const pathname = usePathname();
  const [label, href] = links[role];

  return (
    <nav className="mt-10 flex gap-4 text-sm font-medium md:flex-col">
      <Link href={href} className={pathname === href ? "text-ink" : "text-muted hover:text-ink"}>{label}</Link>
    </nav>
  );
}