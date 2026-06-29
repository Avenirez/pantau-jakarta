"""Budget-related API routes — districts, villages, dashboard data (Production Version)."""

import os
import time
import asyncio
import httpx
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api", tags=["budgets"])

SECTOR_LABELS = {
    "flood": "Banjir & PPSU",
    "infrastructure": "Infrastruktur & Jalan",
    "health": "Kesehatan & Posyandu",
}

# Global httpx AsyncClient with connection reuse for optimal performance
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

async_client = httpx.AsyncClient(
    base_url=SUPABASE_URL,
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    },
    timeout=10.0
)


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
async def village_dashboard(village_id: int):
    """
    Aggregated dashboard payload for a single Kelurahan from Supabase:
    - village & district info
    - metric cards (total budget, top sector, YoY change %)
    - AI narrative
    - Raw budget data for Recharts (highly optimized payload size)
    """
    start_time = time.time()
    try:
        # Define URLs for concurrent fetching
        url_info = f"/rest/v1/villages?id=eq.{village_id}&select=name,districts(name)"
        url_budgets = f"/rest/v1/budgets?village_id=eq.{village_id}&select=sector,program_name,allocation_amount,fiscal_year"
        url_summary = f"/rest/v1/ai_summaries?village_id=eq.{village_id}&select=summarized_text"

        t0 = time.time()
        res_info, res_budgets, res_summary = await asyncio.gather(
            async_client.get(url_info),
            async_client.get(url_budgets),
            async_client.get(url_summary)
        )
        t_parallel = time.time() - t0

        # Validate response status codes
        for res in (res_info, res_budgets, res_summary):
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Database error: {res.text}")

        village_data = res_info.json()
        budgets = res_budgets.json()
        summary_data = res_summary.json()

        if not village_data:
            raise HTTPException(404, "Kelurahan tidak ditemukan di database")

        info = village_data[0]
        village_name = info["name"]
        district_name = info["districts"]["name"] if info.get("districts") else "—"

        narrative = (
            summary_data[0]["summarized_text"]
            if summary_data
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
            f"Parallel API Queries = {t_parallel:.3f}s, "
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
