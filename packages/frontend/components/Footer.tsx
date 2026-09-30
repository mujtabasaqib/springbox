import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-12 text-sm text-muted">
      <span className="display text-2xl text-ink">{site.name}</span>
      <nav className="flex flex-wrap gap-6">
        {site.links.map(([t, h]) => <Link key={h} href={h} className="hover:text-ink">{t}</Link>)}
      </nav>
      <span>© {new Date().getFullYear()} {site.name}</span>
    </footer>
  );
}