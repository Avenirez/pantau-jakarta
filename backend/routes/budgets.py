"""Budget-related API routes — districts, villages, dashboard data (Production Version)."""

import time
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api", tags=["budgets"])

SECTOR_LABELS = {
    "flood": "Banjir & PPSU",
    "infrastructure": "Infrastruktur & Jalan",
    "health": "Kesehatan & Posyandu",
}


@router.get("/districts")
def list_districts():
    """Return all Kecamatan from Supabase, sorted alphabetically."""
    try:
        sb = get_supabase()
        data = sb.table("districts").select("id, name").order("name").execute()
        return data.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/districts/{district_id}/villages")
def list_villages(district_id: int):
    """Return Kelurahan belonging to a Kecamatan from Supabase."""
    try:
        sb = get_supabase()
        data = (
            sb.table("villages")
            .select("id, name")
            .eq("district_id", district_id)
            .order("name")
            .execute()
        )
        return data.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/villages/{village_id}/dashboard")
def village_dashboard(village_id: int):
    """
    Aggregated dashboard payload for a single Kelurahan from Supabase:
    - village & district info
    - metric cards (total budget, top sector, YoY change %)
    - AI narrative
    - Raw budget data for Recharts (highly optimized payload size)
    """
    start_time = time.time()
    try:
        sb = get_supabase()

        # Define functions to run concurrently
        def fetch_village_info():
            t_start = time.time()
            res = sb.table("villages").select("name, districts(name)").eq("id", village_id).execute()
            return res, time.time() - t_start

        def fetch_budgets():
            t_start = time.time()
            res = sb.table("budgets").select("sector, program_name, allocation_amount, fiscal_year").eq("village_id", village_id).execute()
            return res, time.time() - t_start

        def fetch_summary():
            t_start = time.time()
            res = sb.table("ai_summaries").select("summarized_text").eq("village_id", village_id).execute()
            return res, time.time() - t_start

        # Run queries in parallel
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_info = executor.submit(fetch_village_info)
            future_budgets = executor.submit(fetch_budgets)
            future_summary = executor.submit(fetch_summary)

            village_resp, t_info = future_info.result()
            budgets_resp, t_budgets = future_budgets.result()
            summary_resp, t_summary = future_summary.result()
        t_parallel = time.time() - t0

        if not village_resp.data:
            raise HTTPException(404, "Kelurahan tidak ditemukan di database")

        info = village_resp.data[0]
        village_name = info["name"]
        district_name = info["districts"]["name"] if info.get("districts") else "—"

        budgets = budgets_resp.data

        narrative = (
            summary_resp.data[0]["summarized_text"]
            if summary_resp.data
            else "Ringkasan AI belum tersedia untuk kelurahan ini (Gemini API belum dijalankan)."
        )

        # --- metrics ---
        latest_year = max((b["fiscal_year"] for b in budgets), default=2025)
        latest = [b for b in budgets if b["fiscal_year"] == latest_year]
        total_budget = sum(b["allocation_amount"] for b in latest)

        sector_sums: dict[str, int] = {}
        for b in latest:
            sector_sums[b["sector"]] = sector_sums.get(b["sector"], 0) + b["allocation_amount"]
        top_sector_key = max(sector_sums, key=sector_sums.get) if sector_sums else "—"
        top_sector = SECTOR_LABELS.get(top_sector_key, top_sector_key)

        prev = [b for b in budgets if b["fiscal_year"] == latest_year - 1]
        prev_total = sum(b["allocation_amount"] for b in prev)
        yoy = round(((total_budget - prev_total) / prev_total) * 100, 2) if prev_total else 0.0

        # --- format raw budget data for Recharts ---
        recharts_single = []
        for sector_key, label in SECTOR_LABELS.items():
            amount = sum(b["allocation_amount"] for b in latest if b["sector"] == sector_key)
            recharts_single.append({
                "sector": label,
                "amount": amount
            })

        recharts_yearly = []
        years = sorted(list(set(b["fiscal_year"] for b in budgets)))
        for yr in years:
            year_data = {"year": str(yr)}
            for sector_key, label in SECTOR_LABELS.items():
                amount = sum(
                    b["allocation_amount"]
                    for b in budgets
                    if b["fiscal_year"] == yr and b["sector"] == sector_key
                )
                year_data[label] = amount
            recharts_yearly.append(year_data)

        total_elapsed = time.time() - start_time
        print(
            f"[API Profile] Village {village_id}: "
            f"Info={t_info:.3f}s, Budgets={t_budgets:.3f}s, AI={t_summary:.3f}s. "
            f"Total API Process = {total_elapsed:.3f}s"
        )

        return {
            "village_id": village_id,
            "village_name": village_name,
            "district_name": district_name,
            "fiscal_year": latest_year,
            "metrics": {
                "total_budget": total_budget,
                "top_sector": top_sector,
                "yoy_change": yoy,
            },
            "ai_narrative": narrative,
            "chart_single": recharts_single,
            "chart_yearly": recharts_yearly,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
