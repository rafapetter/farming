"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface RainMonthlyChartProps {
  data: Array<{ month: number; totalMm: number }>;
}

export function RainMonthlyChart({ data }: RainMonthlyChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: MONTH_LABELS[d.month - 1],
    total: d.totalMm,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis
          dataKey="name"
          fontSize={12}
          tickLine={false}
          axisLine={false}
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
        />
        <Bar
          dataKey="total"
          name="Chuva Mensal"
          fill="hsl(210, 79%, 46%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
