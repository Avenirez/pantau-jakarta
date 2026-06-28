import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: number; // positive = up, negative = down, 0/undefined = neutral
  icon: React.ReactNode;
  delay?: string;
}

export default function MetricCard({
  label,
  value,
  subtext,
  trend,
  icon,
  delay = "",
}: MetricCardProps) {
  const trendColor =
    trend && trend > 0
      ? "text-emerald-400"
      : trend && trend < 0
        ? "text-red-400"
        : "text-slate-400";

  const TrendIcon =
    trend && trend > 0
      ? TrendingUp
      : trend && trend < 0
        ? TrendingDown
        : Minus;

  return (
    <div
      className={`glass-card metric-hover p-6 opacity-0 animate-fade-in-up ${delay}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="p-2 rounded-lg bg-jakarta-blue/20 text-jakarta-blue-light">
          {icon}
        </div>
      </div>

      <p className="text-3xl font-bold text-white mb-1">{value}</p>

      <div className="flex items-center gap-2 text-sm">
        {trend !== undefined && (
          <>
            <TrendIcon size={14} className={trendColor} />
            <span className={trendColor}>
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          </>
        )}
        {subtext && <span className="text-slate-500">{subtext}</span>}
      </div>
    </div>
  );
}
