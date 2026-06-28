"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

/**
 * Plotly must be loaded client-side only — it accesses `window` internally.
 * We use Next.js dynamic import with ssr: false to prevent hydration errors.
 */
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PlotlyChartProps {
  data: Record<string, unknown>;
  className?: string;
}

export default function PlotlyChart({ data, className = "" }: PlotlyChartProps) {
  const figure = useMemo(() => {
    if (!data || !("data" in data)) return null;
    return data as { data: Plotly.Data[]; layout: Partial<Plotly.Layout> };
  }, [data]);

  if (!figure) {
    return (
      <div className={`glass-card p-8 flex items-center justify-center text-slate-400 ${className}`}>
        Data grafik belum tersedia.
      </div>
    );
  }

  return (
    <div className={`plotly-container ${className}`}>
      <Plot
        data={figure.data}
        layout={{
          ...figure.layout,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: "#CBD5E1", family: "Inter, sans-serif" },
          autosize: true,
          margin: { l: 50, r: 30, t: 60, b: 50 },
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
