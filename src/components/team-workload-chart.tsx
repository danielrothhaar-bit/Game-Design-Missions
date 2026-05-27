"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export type WorkloadDatum = {
  name: string;
  points: number;
  tasks: number;
};

function loadColor(points: number, max: number) {
  if (max === 0) return "#22c55e";
  const ratio = points / max;
  if (ratio >= 0.8) return "#ef4444"; // heaviest — red
  if (ratio >= 0.5) return "#f59e0b"; // amber
  return "#22c55e"; // light — green
}

export function TeamWorkloadChart({ data }: { data: WorkloadDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No assigned open tasks yet.
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.points), 1);
  const height = Math.max(160, data.length * 44);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 36, top: 4, bottom: 4 }}
      >
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="points" radius={[0, 6, 6, 0]} barSize={22}>
          {data.map((d) => (
            <Cell key={d.name} fill={loadColor(d.points, max)} />
          ))}
          <LabelList
            dataKey="points"
            position="right"
            className="fill-foreground"
            style={{ fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
