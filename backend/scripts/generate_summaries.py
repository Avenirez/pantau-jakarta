"""
Batch AI Summarization — generates Gemini narratives for every village.

Rate-limited to stay within Gemini free tier (15 RPM → ~4 s sleep).

Usage:
    python -m scripts.generate_summaries   # run from backend/
"""

import time
from dotenv import load_dotenv

load_dotenv()

from services.supabase_client import get_supabase
from services.gemini_service import summarise_village_budget


def generate_all():
    sb = get_supabase()

    villages = (
        sb.table("villages")
        .select("id, name, districts(name)")
        .execute()
        .data
    )

    if not villages:
        print("Database kosong — jalankan extract_pdf.py terlebih dahulu.")
        return

    print(f"Memproses {len(villages)} kelurahan...\n")

    for idx, v in enumerate(villages, 1):
        vid = v["id"]
        vname = v["name"]
        dname = v["districts"]["name"] if v.get("districts") else "—"

        budgets = (
            sb.table("budgets")
            .select("sector, program_name, allocation_amount")
            .eq("village_id", vid)
            .execute()
            .data
        )

        if not budgets:
            print(f"  [{idx}/{len(villages)}] {vname} — tidak ada data anggaran, skip.")
            continue

        print(f"  [{idx}/{len(villages)}] {vname} — menghubungi Gemini...")
        summary = summarise_village_budget(vname, dname, budgets)

        sb.table("ai_summaries").upsert({
            "village_id": vid,
            "summarized_text": summary,
        }).execute()

        print(f"    ✓ Tersimpan ({len(summary)} karakter)")

        # rate limit: Gemini free tier = 15 RPM
        time.sleep(4)

    print("\n✅ Batch summarization selesai.")


if __name__ == "__main__":
    generate_all()
