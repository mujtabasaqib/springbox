"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  data: { month: string; usd: number }[];
  title?: string;
  unit?: string;  // prefix for values: "$" for money, "" for counts
  label?: string; // series name shown in the tooltip
};

export default function EarningsChart({
  data,
  title = "Earnings over time",
  unit = "$",
  label = "Earnings",
}: Props) {
  const fmt = (v: number) => `${unit}${v.toLocaleString("en-US", { maximumFractionDigits: 3 })}`;

  return (
    <div className="h-64 rounded-3xl border border-line bg-surface p-6">
      <p className="mb-4 font-medium">{title}</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6b66" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b6b66" }}
            axisLine={false}
            tickLine={false}
            width={52}
            allowDecimals={unit === "$"}
            tickFormatter={(v: number) => (unit === "$" ? fmt(v) : v.toLocaleString("en-US"))}
          />
          <Tooltip
  contentStyle={{ borderRadius: 12, border: "1px solid #e4e2da" }}
  formatter={(v) => [fmt(Number(v ?? 0)), label]}
/>
          <Line
            type="monotone"
            dataKey="usd"
            stroke="#3B2BEE"
            strokeWidth={3}
            dot={{ fill: "#D6F24B", stroke: "#111111", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}