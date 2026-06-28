"use client";

import { useState } from "react";
import { X, Heart } from "lucide-react";
import { getQrisImageUrl } from "@/lib/api";

export default function QrisModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        id="qris-donate-button"
        onClick={() => setOpen(true)}
        className="
          group flex items-center gap-3 mx-auto
          px-8 py-4 rounded-2xl
          bg-gradient-to-r from-jakarta-blue to-jakarta-blue-light
          text-white font-semibold text-lg
          shadow-lg shadow-jakarta-blue/30
          hover:shadow-xl hover:shadow-jakarta-blue/40
          hover:scale-[1.02]
          transition-all duration-300
          glow-pulse
        "
      >
        <Heart
          size={22}
          className="group-hover:scale-110 transition-transform"
        />
        Dukung Server Kami (Flat Rp5.000)
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="
              glass-card p-8 max-w-sm w-full mx-4
              animate-fade-in-up
              text-center
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              id="qris-modal-close"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">
              Donasi via QRIS
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Scan QR di bawah menggunakan GoPay, OVO, DANA, LinkAja, atau
              Mobile Banking. Nominal otomatis terkunci{" "}
              <strong className="text-emerald-400">Rp 5.000</strong>.
            </p>

            {/* QR Code image from backend */}
            <div className="bg-white rounded-xl p-4 inline-block mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getQrisImageUrl()}
                alt="QRIS Donasi Rp5.000"
                width={240}
                height={240}
                className="mx-auto"
              />
            </div>

            <p className="text-xs text-slate-500">
              ⚠ Fitur donasi ini bersifat demo/edukatif.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
