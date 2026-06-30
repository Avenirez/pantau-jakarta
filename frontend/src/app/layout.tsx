import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "JakScope — Peta Distribusi Fasilitas Publik Terbuka",
  description:
    "Temukan dan pantau sebaran fasilitas publik riil seperti kesehatan, pendidikan, ruang terbuka hijau, hingga layanan keamanan di kelurahan Jakarta menggunakan data OpenStreetMap.",
  openGraph: {
    title: "JakScope",
    description: "Peta Distribusi Fasilitas Publik DKI Jakarta",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
