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

interface CostBreakdownChartProps {
  data: Array<{
    name: string;
    insumos: number;
    servicos: number;
  }>;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelStyle={{ fontWeight: "bold" }}
        />
        <Legend />
        <Bar
          dataKey="insumos"
          name="Insumos"
          fill="hsl(142, 76%, 36%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="servicos"
          name="Serviços"
          fill="hsl(142, 76%, 56%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
