import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SECTOR_LABELS: Record<string, string> = {
  flood: "Banjir & PPSU",
  infrastructure: "Infrastruktur & Jalan",
  health: "Kesehatan & Posyandu",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ villageId: string }> }
) {
  try {
    const { villageId } = await params;
    const vilId = Number(villageId);

    // Fetch all required data concurrently
    const [villageRes, budgetsRes, summaryRes] = await Promise.all([
      supabase
        .from("villages")
        .select("name, districts(name)")
        .eq("id", vilId)
        .single(),
      supabase
        .from("budgets")
        .select("sector, program_name, allocation_amount, fiscal_year")
        .eq("village_id", vilId),
      supabase
        .from("ai_summaries")
        .select("summarized_text")
        .eq("village_id", vilId)
        .maybeSingle(),
    ]);

    if (villageRes.error || !villageRes.data) {
      return NextResponse.json(
        { error: "Kelurahan tidak ditemukan di database" },
        { status: 404 }
      );
    }

    if (budgetsRes.error) {
      throw budgetsRes.error;
    }

    const info = villageRes.data;
    const villageName = info.name;
    // Handle nested relation districts
    const districtName = (info.districts as any)?.name || "—";

    const budgets = budgetsRes.data || [];
    const summaryData = summaryRes.data;
    const narrative = summaryData?.summarized_text || 
      "Ringkasan AI belum tersedia untuk kelurahan ini (Gemini API belum dijalankan).";

    // --- metrics ---
    const latestYear = budgets.length > 0 
      ? Math.max(...budgets.map((b) => b.fiscal_year)) 
      : 2025;
      
    const latest = budgets.filter((b) => b.fiscal_year === latestYear);
    const totalBudget = latest.reduce((sum, b) => sum + Number(b.allocation_amount), 0);

    const sectorSums: Record<string, number> = {};
    for (const b of latest) {
      sectorSums[b.sector] = (sectorSums[b.sector] || 0) + Number(b.allocation_amount);
    }
    
    let topSectorKey = "—";
    let maxVal = -1;
    for (const [k, val] of Object.entries(sectorSums)) {
      if (val > maxVal) {
        maxVal = val;
        topSectorKey = k;
      }
    }
    const topSector = SECTOR_LABELS[topSectorKey] || topSectorKey;

    const prev = budgets.filter((b) => b.fiscal_year === latestYear - 1);
    const prevTotal = prev.reduce((sum, b) => sum + Number(b.allocation_amount), 0);
    const yoy = prevTotal > 0 
      ? Number((((totalBudget - prevTotal) / prevTotal) * 100).toFixed(2)) 
      : 0.0;

    // --- format raw budget data for Recharts ---
    const rechartsSingle = Object.entries(SECTOR_LABELS).map(([sectorKey, label]) => {
      const amount = latest
        .filter((b) => b.sector === sectorKey)
        .reduce((sum, b) => sum + Number(b.allocation_amount), 0);
      return {
        sector: label,
        amount,
      };
    });

    const years = Array.from(new Set(budgets.map((b) => b.fiscal_year))).sort() as number[];
    const rechartsYearly = years.map((yr) => {
      const yearData: Record<string, any> = { year: String(yr) };
      for (const [sectorKey, label] of Object.entries(SECTOR_LABELS)) {
        const amount = budgets
          .filter((b) => b.fiscal_year === yr && b.sector === sectorKey)
          .reduce((sum, b) => sum + Number(b.allocation_amount), 0);
        yearData[label] = amount;
      }
      return yearData;
    });

    return NextResponse.json({
      village_id: vilId,
      village_name: villageName,
      district_name: districtName,
      fiscal_year: latestYear,
      metrics: {
        total_budget: totalBudget,
        top_sector: topSector,
        yoy_change: yoy,
      },
      ai_narrative: narrative,
      chart_single: rechartsSingle,
      chart_yearly: rechartsYearly,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
