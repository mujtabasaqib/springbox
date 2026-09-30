"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function EarningsChart({ data }: { data: { month: string; usd: number }[] }) {
  return (
    <div className="h-64 rounded-3xl border border-line bg-surface p-6">
      <p className="mb-4 font-medium">Earnings over time</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6b66" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6b6b66" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e2da" }} />
          <Line type="monotone" dataKey="usd" stroke="#3B2BEE" strokeWidth={3} dot={{ fill: "#D6F24B", stroke: "#111111", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}