"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { ScoresDto } from "@/types";

export function ScoreRadar({ scores }: { scores: ScoresDto }) {
  const data = [
    { metric: "Scalability", value: scores.scalability },
    { metric: "Security", value: scores.security },
    { metric: "Reliability", value: scores.reliability },
    { metric: "Maintainability", value: scores.maintainability },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(139,143,168,0.3)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: "#94a3b8", fontSize: 13, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          domain={[0, 10]}
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickCount={6}
        />
        <Radar
          dataKey="value"
          stroke="#00d4ff"
          fill="#00d4ff"
          fillOpacity={0.3}
          strokeWidth={2.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
