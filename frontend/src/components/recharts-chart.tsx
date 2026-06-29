"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// Helper to format currency
const formatRupiahTooltip = (value: number) => {
  return `Rp ${value.toLocaleString("id-ID")}`;
};

const formatRupiahAxis = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} M`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)} Jt`;
  }
  return value.toLocaleString("id-ID");
};

// Custom Glassmorphism Tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-md p-4 rounded-xl shadow-xl">
        <p className="text-sm font-semibold text-slate-300 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((item: any) => (
            <div key={item.name} className="flex items-center gap-4 justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}:
              </span>
              <span className="font-bold text-white">
                {formatRupiahTooltip(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

interface SingleChartProps {
  data: Array<{ sector: string; amount: number }>;
}

export function SectorAreaChart({ data }: SingleChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
        <XAxis
          dataKey="sector"
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatRupiahAxis}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          name="Jumlah Anggaran"
          type="monotone"
          dataKey="amount"
          stroke="#3B82F6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorAmount)"
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface YearlyChartProps {
  data: Array<Record<string, any>>;
}

export function YearlyBarChart({ data }: YearlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
        <XAxis
          dataKey="year"
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatRupiahAxis}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}
        />
        <Bar
          name="Banjir & PPSU"
          dataKey="Banjir & PPSU"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
          animationDuration={1200}
        />
        <Bar
          name="Infrastruktur & Jalan"
          dataKey="Infrastruktur & Jalan"
          fill="#D97706"
          radius={[4, 4, 0, 0]}
          animationDuration={1200}
        />
        <Bar
          name="Kesehatan & Posyandu"
          dataKey="Kesehatan & Posyandu"
          fill="#059669"
          radius={[4, 4, 0, 0]}
          animationDuration={1200}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
