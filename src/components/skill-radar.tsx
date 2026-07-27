"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export type ProficiencyDatum = { skill: string; level: number };

const LEVEL_LABEL = ["None", "Beginner", "Intermediate", "Advanced", "Expert"];
const LEVEL_COLOR = ["#3f3f46", "#22c55e", "#eab308", "#ef4444", "#a855f7"];

export function SkillRadar({
  data,
  height = 280,
}: {
  data: ProficiencyDatum[];
  height?: number;
}) {
  const points = data.filter((d) => d.level > 0);

  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No skill proficiencies set yet.
      </p>
    );
  }

  // A radar needs 3+ axes to read well; fall back to bars otherwise.
  if (points.length < 3) {
    return (
      <ul className="space-y-2">
        {points.map((d) => (
          <li key={d.skill}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{d.skill}</span>
              <span style={{ color: LEVEL_COLOR[d.level] }}>
                {LEVEL_LABEL[d.level]}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-secondary">
              <div
                className="h-full rounded"
                style={{
                  width: `${(d.level / 4) * 100}%`,
                  backgroundColor: LEVEL_COLOR[d.level],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={points} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
        />
        <PolarRadiusAxis
          domain={[0, 4]}
          tickCount={5}
          tick={false}
          axisLine={false}
        />
        <Radar
          dataKey="level"
          stroke="#a855f7"
          fill="#a855f7"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
