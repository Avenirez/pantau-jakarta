import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PantauJakarta — Transparansi Anggaran Digital Jakarta",
  description:
    "Platform CivicTech yang mengubah dokumen APBD Jakarta menjadi narasi publik yang mudah dipahami dan visualisasi data interaktif.",
  openGraph: {
    title: "PantauJakarta",
    description: "Transparansi Anggaran Digital Jakarta",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
