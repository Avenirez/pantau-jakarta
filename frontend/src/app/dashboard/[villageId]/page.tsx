"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Trophy,
  TrendingUp,
  Sparkles,
  MapPin,
} from "lucide-react";
import dynamic from "next/dynamic";

import { fetchDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/api";
import MetricCard from "@/components/metric-card";
import QrisModal from "@/components/qris-modal";
import AuthButton from "@/components/auth-button";
import ReviewSection from "@/components/review-section";
import { fetchFacilitiesFromOSM, type Facility } from "@/lib/overpass";

// Import Leaflet map component dynamically with SSR disabled to prevent Node window error
const InteractiveMap = dynamic(() => import("@/components/interactive-map"), {
  ssr: false,
});


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

  // States for OSM Facilities Map
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<"all" | "health" | "infrastructure" | "flood">("all");

  useEffect(() => {
    if (!villageId) return;
    setLoading(true);
    fetchDashboard(villageId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [villageId]);

  // Fetch real facilities from OpenStreetMap when village name becomes available
  useEffect(() => {
    if (!data?.village_name) return;
    setLoadingMap(true);
    fetchFacilitiesFromOSM(data.village_name)
      .then(setFacilities)
      .catch((err) => console.error("Error fetching OSM data:", err))
      .finally(() => setLoadingMap(false));
  }, [data?.village_name]);


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

        {/* ===== INTERACTIVE MAP ===== */}
        <section className="glass-card p-6 opacity-0 animate-fade-in-up animate-delay-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin size={20} className="text-jakarta-blue-light animate-bounce" />
                Peta Distribusi Fasilitas Publik (Data Riil OSM)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Lokasi fisik fasilitas sosial & umum asli di Kelurahan {data.village_name} yang diambil dari database OpenStreetMap.
              </p>
            </div>

            {/* Filter Sektor */}
            <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              {[
                { id: "all", label: "Semua Sektor", activeClass: "bg-slate-800 text-white border-slate-700 shadow-sm" },
                { id: "health", label: "Kesehatan", activeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-950" },
                { id: "infrastructure", label: "Infrastruktur & Taman", activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-950" },
                { id: "flood", label: "Banjir & Sanitasi", activeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-950" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSelectedSectorFilter(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all duration-200 ${
                    selectedSectorFilter === btn.id
                      ? btn.activeClass
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {loadingMap ? (
            <div className="w-full h-[400px] bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-800/60 shadow-inner">
              <div className="text-center">
                <div className="w-9 h-9 border-4 border-jakarta-blue-light border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Menghubungi OpenStreetMap Overpass API...</p>
                <p className="text-xs text-slate-600 mt-1">Mengambil koordinat fasilitas kelurahan {data.village_name}</p>
              </div>
            </div>
          ) : (
            <InteractiveMap
              facilities={facilities}
              selectedSector={selectedSectorFilter}
              villageName={data.village_name}
            />
          )}
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
