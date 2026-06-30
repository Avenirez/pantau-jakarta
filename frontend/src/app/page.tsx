"use client";

import { BarChart3, Shield, Search } from "lucide-react";
import dynamic from "next/dynamic";

const JakartaMap = dynamic(() => import("@/components/jakarta-map"), {
  ssr: false,
});

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-gradient relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-jakarta-blue-light/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-jakarta-emerald/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
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

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed opacity-0 animate-fade-in-up animate-delay-200">
            Ubah dokumen APBD yang kompleks menjadi narasi publik yang mudah
            dipahami dan visualisasi data interaktif. Karena setiap rupiah
            anggaran adalah hak publik untuk diketahui.
          </p>

          {/* ===== INTERACTIVE JAKARTA MAP ===== */}
          <div className="max-w-4xl mx-auto opacity-0 animate-fade-in-up animate-delay-300">
            <JakartaMap />
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
