import type { Metadata } from "next";
import { headers } from "next/headers";
import DashboardClient from "./DashboardClient";
import type { DashboardData } from "@/lib/api";

type Props = {
  params: Promise<{ villageId: string }>;
};

async function getDashboardData(villageId: string): Promise<DashboardData> {
  // Pakai internal API route Next.js (sudah connect langsung ke Supabase),
  // bukan backend FastAPI eksternal yang tidak di-deploy.
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/villages/${villageId}/dashboard`, {
    next: { revalidate: 3600 } // Cache data for 1 hour
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Gagal mengambil data dashboard kelurahan (Status ${res.status})`);
  }

  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { villageId } = await params;
  try {
    const data = await getDashboardData(villageId);
    return {
      title: `Sebaran Fasilitas Kelurahan ${data.village_name} | JakScope`,
      description: `Peta interaktif sebaran fasilitas umum (kesehatan, pendidikan, dll.) di Kelurahan ${data.village_name}, Kecamatan ${data.district_name}.`,
    };
  } catch (error) {
    return {
      title: "Dashboard Kelurahan | JakScope",
      description: "Peta sebaran fasilitas umum tingkat Kelurahan di DKI Jakarta.",
    };
  }
}

export default async function VillageDashboardPage({ params }: Props) {
  const { villageId } = await params;
  try {
    const data = await getDashboardData(villageId);
    return <DashboardClient initialData={data} />;
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-rose-400 mb-4">
            {error.message || "Data tidak ditemukan."}
          </p>
          <a
            href="/"
            className="text-jakarta-blue-light hover:underline"
          >
            ← Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }
}
