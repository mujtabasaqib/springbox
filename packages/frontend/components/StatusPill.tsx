const styles: Record<string, string> = {
  live: "bg-brand-a text-ink",
  ending: "bg-brand-b text-white",
  ended: "bg-line text-muted",
  paused: "bg-line text-muted",
  claimed: "bg-brand-a text-ink",
  pending: "border border-line text-muted",
  withdraw: "bg-brand-a text-ink",
};

export default function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${styles[status] ?? "bg-line text-muted"}`}>{status}</span>;
}