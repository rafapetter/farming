"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PriceData {
  date: string;
  soy?: number;
  corn?: number;
  soyCbot?: number;
  cornCbot?: number;
}

interface PriceHistoryChartProps {
  data: PriceData[];
  showCbot?: boolean;
}

export function PriceHistoryChart({
  data,
  showCbot = false,
}: PriceHistoryChartProps) {
  const formatDate = (date: string) => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const formatPrice = (value: number) =>
    `R$ ${value.toFixed(2)}`;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => `R$${v}`}
          tick={{ fontSize: 11 }}
          width={60}
        />
        <Tooltip
          formatter={(value) =>
            `R$ ${Number(value).toFixed(2)}`
          }
          labelFormatter={(label) => formatDate(String(label))}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="soy"
          stroke="#16a34a"
          strokeWidth={2}
          name="Soja CEPEA"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="corn"
          stroke="#eab308"
          strokeWidth={2}
          name="Milho CEPEA"
          dot={false}
          connectNulls
        />
        {showCbot && (
          <>
            <Line
              type="monotone"
              dataKey="soyCbot"
              stroke="#16a34a"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Soja CBOT"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="cornCbot"
              stroke="#eab308"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Milho CBOT"
              dot={false}
              connectNulls
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
