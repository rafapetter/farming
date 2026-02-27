"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RainTimelineChartProps {
  data: Array<{
    date: string;
    precipitationMm: number;
  }>;
}

export function RainTimelineChart({ data }: RainTimelineChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    chuva: d.precipitationMm,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis
          dataKey="name"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}mm`}
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toFixed(1)} mm`,
            "Precipitação",
          ]}
          labelStyle={{ fontWeight: "bold" }}
        />
        <Bar
          dataKey="chuva"
          name="Chuva"
          fill="hsl(210, 79%, 46%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
