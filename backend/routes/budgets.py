"""Budget-related API routes — districts, villages, dashboard data (Production Version)."""

import json
from fastapi import APIRouter, HTTPException

from services.supabase_client import get_supabase
from services.plotly_service import budget_bar_chart_json, budget_yearly_comparison_json

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
    - Plotly chart JSON (single-year + yearly comparison)
    """
    try:
        sb = get_supabase()

        # --- village info ---
        village_resp = (
            sb.table("villages")
            .select("name, districts(name)")
            .eq("id", village_id)
            .execute()
        )
        if not village_resp.data:
            raise HTTPException(404, "Kelurahan tidak ditemukan di database")

        info = village_resp.data[0]
        village_name = info["name"]
        district_name = info["districts"]["name"] if info.get("districts") else "—"

        # --- budgets (all years) ---
        budgets = (
            sb.table("budgets")
            .select("sector, program_name, allocation_amount, fiscal_year")
            .eq("village_id", village_id)
            .execute()
            .data
        )

        # --- AI narrative ---
        summary_resp = (
            sb.table("ai_summaries")
            .select("summarized_text")
            .eq("village_id", village_id)
            .execute()
        )
        narrative = (
            summary_resp.data[0]["summarized_text"]
            if summary_resp.data
            else "Ringkasan AI belum tersedia untuk kelurahan ini (Gemini API belum dijalankan)."
        )

        # --- metrics ---
        latest_year = max((b["fiscal_year"] for b in budgets), default=2024)
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

        # --- charts ---
        chart_single = json.loads(budget_bar_chart_json(village_name, latest))
        chart_yearly = json.loads(budget_yearly_comparison_json(village_name, budgets))

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
            "chart_single": chart_single,
            "chart_yearly": chart_yearly,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
