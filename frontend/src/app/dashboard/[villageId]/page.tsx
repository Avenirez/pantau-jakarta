"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Trophy,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { fetchDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/api";
import MetricCard from "@/components/metric-card";
import PlotlyChart from "@/components/plotly-chart";
import QrisModal from "@/components/qris-modal";
import AuthButton from "@/components/auth-button";
import ReviewSection from "@/components/review-section";

function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(0)} Jt`;
  }
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function VillageDashboard() {
  const params = useParams();
  const router = useRouter();
  const villageId = Number(params.villageId);

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!villageId) return;
    setLoading(true);
    fetchDashboard(villageId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [villageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-jakarta-blue-light border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Memuat data kelurahan...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">
            {error || "Data tidak ditemukan."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-jakarta-blue-light hover:underline"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <main className="min-h-screen">
      {/* ===== HEADER ===== */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            id="back-button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Beranda</span>
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-white">
              Kelurahan {data.village_name}
            </h1>
            <p className="text-xs text-slate-400">
              Kecamatan {data.district_name} · TA {data.fiscal_year}
            </p>
          </div>

          {/* Auth Button — replaces the empty spacer */}
          <AuthButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ===== METRIC CARDS ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Anggaran"
            value={formatRupiah(metrics.total_budget)}
            icon={<Wallet size={20} />}
            subtext={`Tahun ${data.fiscal_year}`}
            delay="animate-delay-100"
          />
          <MetricCard
            label="Sektor Terbesar"
            value={metrics.top_sector}
            icon={<Trophy size={20} />}
            delay="animate-delay-200"
          />
          <MetricCard
            label="Perubahan YoY"
            value={`${metrics.yoy_change > 0 ? "+" : ""}${metrics.yoy_change}%`}
            icon={<TrendingUp size={20} />}
            trend={metrics.yoy_change}
            subtext="vs tahun sebelumnya"
            delay="animate-delay-300"
          />
        </section>

        {/* ===== CHARTS ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 opacity-0 animate-fade-in-up animate-delay-200">
            <h2 className="text-lg font-semibold text-white mb-4">
              Rincian per Sektor ({data.fiscal_year})
            </h2>
            <div className="h-[350px]">
              <PlotlyChart data={data.chart_single} />
            </div>
          </div>

          <div className="glass-card p-6 opacity-0 animate-fade-in-up animate-delay-300">
            <h2 className="text-lg font-semibold text-white mb-4">
              Perbandingan Tahunan (2023–2025)
            </h2>
            <div className="h-[350px]">
              <PlotlyChart data={data.chart_yearly} />
            </div>
          </div>
        </section>

        {/* ===== AI NARRATIVE ===== */}
        <section className="glass-card p-8 opacity-0 animate-fade-in-up animate-delay-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-jakarta-emerald/20 text-jakarta-emerald">
              <Sparkles size={20} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Ringkasan AI
            </h2>
          </div>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
            {data.ai_narrative}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Dihasilkan oleh Gemini AI — bersifat ringkasan otomatis, bukan
            opini resmi pemerintah.
          </p>
        </section>

        {/* ===== REVIEWS & RATINGS ===== */}
        <ReviewSection villageId={villageId} />

        {/* ===== DONATION / QRIS ===== */}
        <section className="text-center py-12 opacity-0 animate-fade-in-up animate-delay-400">
          <p className="text-slate-400 mb-4 text-sm">
            Platform ini dikelola secara sukarela. Bantu kami menjaga server
            tetap berjalan.
          </p>
          <QrisModal />
        </section>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        PantauJakarta · Data dari{" "}
        <a
          href="https://apbd.jakarta.go.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-jakarta-blue-light hover:underline"
        >
          apbd.jakarta.go.id
        </a>
      </footer>
    </main>
  );
}
