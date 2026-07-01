"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  AlertCircle,
} from "lucide-react";
import dynamic from "next/dynamic";

import type { DashboardData } from "@/lib/api";
import QrisModal from "@/components/qris-modal";
import AuthButton from "@/components/auth-button";
import ReviewSection from "@/components/review-section";
import { fetchFacilitiesFromOSM, type Facility } from "@/lib/overpass";

// Import Leaflet map component dynamically with SSR disabled to prevent Node window error
const InteractiveMap = dynamic(() => import("@/components/interactive-map"), {
  ssr: false,
});

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const villageId = initialData.village_id;

  const [data] = useState<DashboardData>(initialData);

  // States for OSM Facilities Map
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [villageCenter, setVillageCenter] = useState<[number, number] | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>("all");
  const [mapError, setMapError] = useState<string | null>(null);

  // Fetch real facilities from OpenStreetMap when village name becomes available
  useEffect(() => {
    if (!data?.village_name) return;
    setLoadingMap(true);
    setMapError(null);
    fetchFacilitiesFromOSM(data.village_name)
      .then((res) => {
        setFacilities(res.facilities);
        setVillageCenter(res.center);
      })
      .catch((err) => {
        console.error("Error fetching OSM data:", err);
        setMapError(err.message || "Gagal mengambil data dari OpenStreetMap.");
      })
      .finally(() => setLoadingMap(false));
  }, [data?.village_name]);

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
                { id: "education", label: "Pendidikan", activeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-sm shadow-sky-950" },
                { id: "recreation", label: "Taman & Olahraga", activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-950" },
                { id: "public_services", label: "Keamanan & Publik", activeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-sm shadow-purple-950" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSelectedSectorFilter(btn.id)}
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
          ) : mapError ? (
            <div className="w-full h-[400px] bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-800/60 shadow-inner p-6 text-center">
              <div className="max-w-md">
                <AlertCircle className="w-9 h-9 text-rose-400 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-slate-200 font-semibold">{mapError}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Layanan data peta sedang padat atau mengalami gangguan timeout. Silakan klik tombol di bawah untuk memuat ulang data peta.
                </p>
                <button
                  onClick={() => {
                    setLoadingMap(true);
                    setMapError(null);
                    fetchFacilitiesFromOSM(data.village_name)
                      .then((res) => {
                        setFacilities(res.facilities);
                        setVillageCenter(res.center);
                      })
                      .catch((err) => {
                        console.error(err);
                        setMapError(err.message || "Gagal memuat data peta.");
                      })
                      .finally(() => setLoadingMap(false));
                  }}
                  className="mt-4 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/60 transition-colors shadow-md"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : (
            <InteractiveMap
              facilities={facilities}
              selectedSector={selectedSectorFilter}
              villageName={data.village_name}
              center={villageCenter}
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
        JakScope · Data dari{" "}
        <a
          href="https://www.openstreetmap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-jakarta-blue-light hover:underline"
        >
          openstreetmap.org
        </a>
      </footer>
    </main>
  );
}
