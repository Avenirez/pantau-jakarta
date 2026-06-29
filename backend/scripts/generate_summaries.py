"""
Generate AI summaries for each village using Gemini 1.5 Flash.

Fetches village budgets from Supabase, builds prompt, requests summary,
and upserts into the `ai_summaries` table.

Respects free-tier rate limits (approx 15 requests per minute -> ~4s delay).
"""

import os
import time
from dotenv import load_dotenv

load_dotenv()

from services.supabase_client import get_supabase
from services.gemini_service import summarise_village_budget


def generate_all():
    sb = get_supabase()

    # Get all villages with their district names
    villages = (
        sb.table("villages")
        .select("id, name, district_id, districts(name)")
        .execute()
        .data
    )
    print(f"Memproses {len(villages)} kelurahan...\n")

    for idx, v in enumerate(villages, 1):
        vid = v["id"]
        vname = v["name"]
        dname = v["districts"]["name"] if v.get("districts") else "DKI Jakarta"

        print(f"  [{idx}/{len(villages)}] {vname} ({dname}) - menghubungi Gemini...")

        # Fetch budgets for this village
        budgets = (
            sb.table("budgets")
            .select("sector, program_name, allocation_amount, fiscal_year")
            .eq("village_id", vid)
            .execute()
            .data
        )

        if not budgets:
            print(f"    Skip - tidak ada data anggaran.")
            continue

        try:
            # Call Gemini with proper signature: name, district, budget_rows with retry on rate limit
            while True:
                summary = summarise_village_budget(vname, dname, budgets)
                if "quota" in summary.lower() or "429" in summary.lower() or "limit" in summary.lower():
                    print(f"    Terkena rate limit Gemini. Menunggu 30 detik untuk mencoba kembali...")
                    time.sleep(30.0)
                    continue
                break

            if not summary or summary.startswith("Gagal menghasilkan ringkasan"):
                print(f"    Gagal - {summary}")
                continue

            # Upsert into DB
            sb.table("ai_summaries").upsert({
                "village_id": vid,
                "summarized_text": summary,
            }).execute()

            print(f"    Sukses - Tersimpan ({len(summary)} karakter)")

        except Exception as exc:
            print(f"    Error: {exc}")

        # Sleep to avoid hitting 15 RPM rate limit
        time.sleep(5.0)



if __name__ == "__main__":
    generate_all()
