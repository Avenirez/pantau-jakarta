"""Chart route — serves pre-rendered Plotly JSON for a village."""

import json
from fastapi import APIRouter, HTTPException

from services.supabase_client import get_supabase
from services.plotly_service import budget_bar_chart_json

router = APIRouter(prefix="/api", tags=["charts"])


@router.get("/villages/{village_id}/chart")
def village_chart(village_id: int, year: int | None = None):
    """
    Return Plotly figure JSON for a specific Kelurahan.
    Optional ``year`` query param filters fiscal year (defaults to latest).
    """
    sb = get_supabase()

    # village name for chart title
    village_resp = sb.table("villages").select("name").eq("id", village_id).execute()
    if not village_resp.data:
        raise HTTPException(404, "Kelurahan tidak ditemukan")
    village_name = village_resp.data[0]["name"]

    # fetch budgets
    query = sb.table("budgets").select("sector, allocation_amount").eq("village_id", village_id)
    if year:
        query = query.eq("fiscal_year", year)
    rows = query.execute().data

    if not rows:
        raise HTTPException(404, "Belum ada data anggaran untuk kelurahan ini")

    chart_json_str = budget_bar_chart_json(village_name, rows)
    return json.loads(chart_json_str)
