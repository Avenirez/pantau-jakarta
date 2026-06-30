"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, AlertCircle, Loader2 } from "lucide-react";

export default function JakartaMap() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Bounds around Jakarta region to restrict panning
    const jakartaBounds = L.latLngBounds(
      [-6.40, 106.65], // Southwest corner (Tangerang/Bogor border)
      [-5.90, 107.05]  // Northeast corner (Tanjung Priok/Bekasi border)
    );

    // Centered at Jakarta
    const map = L.map(mapContainerRef.current, {
      center: [-6.2088, 106.8456],
      zoom: 11.5,
      minZoom: 11,
      maxZoom: 17,
      maxBounds: jakartaBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    // Dark-themed tiles to match premium glassmorphism dark theme
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    // Handle Click
    const onMapClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage("Mendeteksi kelurahan dari koordinat...");

      try {
        // Query our server-side detection and lookup API
        const response = await fetch(`/api/villages/detect?lat=${lat}&lng=${lng}`);
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Koordinat berada di luar batas Kelurahan DKI Jakarta atau tidak terdaftar.");
        }

        const lookupData = await response.json();
        setStatusMessage(`Ditemukan: Kelurahan ${lookupData.name}! Mengalihkan ke dashboard...`);
        
        // Navigate
        router.push(`/dashboard/${lookupData.id}`);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || "Terjadi kesalahan koneksi.");
        setLoading(false);
      }
    };

    map.on("click", onMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", onMapClick);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [router]);

  return (
    <div className="relative w-full h-[500px] rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10 cursor-crosshair" />

      {/* Floating Helper overlay */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-4 shadow-xl max-w-sm pointer-events-none">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-jakarta-blue/20 text-jakarta-blue-light mt-0.5">
            <MapPin size={18} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Eksplorasi Peta DKI Jakarta</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Silakan **klik pada titik mana saja** di peta Jakarta. Sistem akan langsung mendeteksi Kelurahannya dan memuat dashboard anggaran publiknya.
            </p>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
          <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs shadow-2xl">
            <Loader2 className="w-9 h-9 text-jakarta-blue-light animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-200 font-semibold">{statusMessage}</p>
            <p className="text-xs text-slate-400 mt-1.5">Mohon tunggu sebentar...</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-rose-950/90 backdrop-blur-md border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-lg max-w-md animate-fade-in-up">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <span className="text-xs font-medium leading-relaxed">{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-[10px] uppercase font-bold tracking-wider text-rose-400 hover:text-white ml-2 focus:outline-none"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}
