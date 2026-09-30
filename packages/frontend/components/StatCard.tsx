export default function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <p className="display text-5xl">{value}</p>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </div>
  );
}