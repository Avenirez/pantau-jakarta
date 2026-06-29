"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, BarChart3, Shield, ChevronDown } from "lucide-react";
import { fetchDistricts, fetchVillages } from "@/lib/api";
import type { District, Village } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();

  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Searchable dropdown states
  const [districtQuery, setDistrictQuery] = useState("");
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const districtRef = useRef<HTMLDivElement>(null);

  // Load districts on mount
  useEffect(() => {
    fetchDistricts()
      .then(setDistricts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Handle click outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setIsDistrictOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load villages when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setVillages([]);
      setSelectedVillage(null);
      return;
    }
    setSelectedVillage(null);
    fetchVillages(selectedDistrict).then(setVillages).catch(console.error);
  }, [selectedDistrict]);

  // Prefetch dashboard page when village is selected to eliminate navigation delay
  useEffect(() => {
    if (selectedVillage) {
      router.prefetch(`/dashboard/${selectedVillage}`);
    }
  }, [selectedVillage, router]);

  const handleSelectDistrict = (id: number, name: string) => {
    setSelectedDistrict(id);
    setDistrictQuery(name);
    setIsDistrictOpen(false);
  };

  const handleDistrictSearchChange = (val: string) => {
    setDistrictQuery(val);
    setIsDistrictOpen(true);
    if (!val) {
      setSelectedDistrict(null);
    }
  };

  const filteredDistricts = districtQuery === ""
    ? districts
    : districts.filter((d) =>
        d.name.toLowerCase().includes(districtQuery.toLowerCase())
      );

  const handleSubmit = () => {
    if (selectedVillage) {
      router.push(`/dashboard/${selectedVillage}`);
    }
  };

  return (
    <main className="min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-gradient relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-jakarta-blue-light/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-jakarta-emerald/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-8 opacity-0 animate-fade-in-up">
            <Shield size={14} className="text-jakarta-emerald" />
            Platform CivicTech — Transparansi Anggaran Jakarta
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 opacity-0 animate-fade-in-up animate-delay-100">
            Pantau{" "}
            <span className="bg-gradient-to-r from-jakarta-blue-light to-jakarta-emerald bg-clip-text text-transparent">
              Jakarta
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed opacity-0 animate-fade-in-up animate-delay-200">
            Ubah dokumen APBD yang kompleks menjadi narasi publik yang mudah
            dipahami dan visualisasi data interaktif. Karena setiap rupiah
            anggaran adalah hak publik untuk diketahui.
          </p>

          {/* ===== CASCADING DROPDOWN ===== */}
          <div className="glass-card p-6 md:p-8 max-w-lg mx-auto opacity-0 animate-fade-in-up animate-delay-300">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
              Mulai Pantau Anggaran
            </p>

            {/* Kecamatan Searchable Dropdown */}
            <div className="relative mb-4" ref={districtRef}>
              <input
                id="select-district-search"
                type="text"
                value={districtQuery}
                placeholder={loading ? "Memuat data..." : "Ketik/Pilih Kecamatan..."}
                onFocus={() => setIsDistrictOpen(true)}
                onChange={(e) => handleDistrictSearchChange(e.target.value)}
                className="
                  w-full
                  bg-slate-800/80 border border-slate-600/50
                  text-white placeholder-slate-400
                  rounded-xl px-4 py-3.5 pr-10
                  focus:outline-none focus:ring-2 focus:ring-jakarta-blue-light/50 focus:border-jakarta-blue-light
                  transition-colors
                "
              />
              <button
                type="button"
                onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 focus:outline-none"
              >
                <ChevronDown size={18} />
              </button>

              {/* Dropdown list */}
              {isDistrictOpen && (
                <div className="
                  absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto
                  bg-slate-800/95 border border-slate-700/80
                  rounded-xl shadow-xl backdrop-blur-md
                ">
                  {filteredDistricts.length === 0 ? (
                    <div className="px-4 py-3 text-slate-400 text-sm">
                      Kecamatan tidak ditemukan
                    </div>
                  ) : (
                    filteredDistricts.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDistrict(d.id, d.name)}
                        className={`
                          w-full text-left px-4 py-3 text-sm text-slate-200
                          hover:bg-jakarta-blue/20 hover:text-white
                          transition-colors border-b border-slate-700/40 last:border-0
                          ${selectedDistrict === d.id ? "bg-jakarta-blue/30 text-white font-semibold" : ""}
                        `}
                      >
                        {d.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Kelurahan Dropdown */}
            <div className="relative mb-6">
              <select
                id="select-village"
                value={selectedVillage ?? ""}
                onChange={(e) =>
                  setSelectedVillage(e.target.value ? Number(e.target.value) : null)
                }
                disabled={!selectedDistrict}
                className="
                  w-full appearance-none
                  bg-slate-800/80 border border-slate-600/50
                  text-white placeholder-slate-400
                  rounded-xl px-4 py-3.5 pr-10
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-jakarta-blue-light/50 focus:border-jakarta-blue-light
                  transition-colors
                "
              >
                <option value="">
                  {selectedDistrict
                    ? villages.length
                      ? "Pilih Kelurahan..."
                      : "Memuat kelurahan..."
                    : "Pilih kecamatan terlebih dahulu"}
                </option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Submit */}
            <button
              id="submit-explore"
              onClick={handleSubmit}
              disabled={!selectedVillage}
              className="
                w-full flex items-center justify-center gap-2
                bg-gradient-to-r from-jakarta-blue to-jakarta-blue-light
                text-white font-semibold py-3.5 rounded-xl
                hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed
                transition-opacity
              "
            >
              <Search size={18} />
              Lihat Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Mengapa{" "}
          <span className="text-jakarta-blue-light">PantauJakarta</span>?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <BarChart3 size={28} />,
              title: "Visualisasi Interaktif",
              desc: "Grafik anggaran per sektor yang bisa diklik dan dieksplorasi — bukan lagi tabel PDF yang membingungkan.",
              color: "text-jakarta-blue-light",
            },
            {
              icon: <Shield size={28} />,
              title: "Narasi AI",
              desc: "Ringkasan anggaran dalam bahasa sehari-hari, dihasilkan oleh AI Gemini agar mudah dipahami semua kalangan.",
              color: "text-jakarta-emerald",
            },
            {
              icon: <Search size={28} />,
              title: "Data Terbuka",
              desc: "Sumber data langsung dari portal resmi APBD Jakarta (apbd.jakarta.go.id) — tiga tahun anggaran: 2023, 2024, 2025.",
              color: "text-jakarta-amber",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card p-6 metric-hover"
            >
              <div className={`mb-4 ${feature.color}`}>{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>
          PantauJakarta — Proyek CivicTech untuk transparansi anggaran publik.
        </p>
        <p className="mt-1">
          Data bersumber dari{" "}
          <a
            href="https://apbd.jakarta.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jakarta-blue-light hover:underline"
          >
            apbd.jakarta.go.id
          </a>
        </p>
      </footer>
    </main>
  );
}
