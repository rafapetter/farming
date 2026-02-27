"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CropWaterNeedsChartProps {
  data: Array<{
    name: string;
    acumulado: number;
    minimo: number;
    ideal: number;
  }>;
}

export function CropWaterNeedsChart({ data }: CropWaterNeedsChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
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
        <Tooltip formatter={(value) => [`${Number(value).toFixed(0)} mm`]} />
        <Legend />
        <Bar
          dataKey="acumulado"
          name="Chuva Recebida"
          fill="hsl(210, 79%, 46%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="minimo"
          name="Mínimo Necessário"
          fill="hsl(45, 93%, 47%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="ideal"
          name="Ideal"
          fill="hsl(142, 76%, 36%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
