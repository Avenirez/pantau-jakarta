import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";
import type { DashboardData } from "@/lib/api";

type Props = {
  params: Promise<{ villageId: string }>;
};

async function getDashboardData(villageId: string): Promise<DashboardData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/api/villages/${villageId}/dashboard`, {
    next: { revalidate: 3600 } // Cache data for 1 hour
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil data dashboard kelurahan (Status ${res.status})`);
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
