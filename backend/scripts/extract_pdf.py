"""
Extract budget data from APBD Jakarta PDFs using pdfplumber.

Reads downloaded PDFs, parses tables for Kecamatan/Kelurahan budget lines
in three sectors (flood, infrastructure, health), and inserts normalized
records into Supabase.

Usage:
    python -m scripts.extract_pdf          # run from backend/
"""

import os
import re
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

# Import after load_dotenv so env vars are available
from services.supabase_client import get_supabase
from scripts.download_pdfs import download_all

# ---------------------------------------------------------------------------
# Sector keyword matching
# ---------------------------------------------------------------------------

_FLOOD_KEYWORDS = ["ppsu", "penanganan prasarana", "banjir", "saluran air", "drainase", "pompa air"]
_INFRA_KEYWORDS = ["jalan", "jembatan", "penerangan jalan", "trotoar", "aspal", "gorong-gorong"]
_HEALTH_KEYWORDS = ["posyandu", "kesehatan", "puskesmas", "makanan tambahan", "stunting", "imunisasi"]


def _classify_sector(text: str) -> str | None:
    """Return sector key if *text* matches a target sector, else None."""
    low = text.lower()
    if any(k in low for k in _FLOOD_KEYWORDS):
        return "flood"
    if any(k in low for k in _INFRA_KEYWORDS):
        return "infrastructure"
    if any(k in low for k in _HEALTH_KEYWORDS):
        return "health"
    return None


def _clean_amount(raw: str) -> int:
    """
    Convert a messy budget string like "1.250.000,00" or "Rp 1.250.000" to int.
    Returns 0 if unparseable.
    """
    if not raw:
        return 0
    digits = re.sub(r"[^\d]", "", raw.split(",")[0])
    return int(digits) if digits else 0


# ---------------------------------------------------------------------------
# Supabase upsert helpers
# ---------------------------------------------------------------------------

def _get_or_create_district(name: str) -> int:
    sb = get_supabase()
    clean = name.strip().upper()
    rows = sb.table("districts").select("id").eq("name", clean).execute().data
    if rows:
        return rows[0]["id"]
    return sb.table("districts").insert({"name": clean}).execute().data[0]["id"]


def _get_or_create_village(district_id: int, name: str) -> int:
    sb = get_supabase()
    clean = name.strip().upper()
    rows = (
        sb.table("villages")
        .select("id")
        .eq("district_id", district_id)
        .eq("name", clean)
        .execute()
        .data
    )
    if rows:
        return rows[0]["id"]
    return (
        sb.table("villages")
        .insert({"district_id": district_id, "name": clean})
        .execute()
        .data[0]["id"]
    )


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

def extract_and_load(filepath: str, fiscal_year: int) -> int:
    """
    Parse a single APBD PDF and insert matching budget rows into Supabase.

    Returns the number of budget rows inserted.
    """
    sb = get_supabase()
    inserted = 0
    current_district_id: int | None = None
    current_village_id: int | None = None
    current_district_name = ""
    current_village_name = ""

    with pdfplumber.open(filepath) as pdf:
        total_pages = len(pdf.pages)
        print(f"  [{fiscal_year}] Total halaman: {total_pages}")

        # Note: Since APBD files are huge, for the demo/MVP we scan pages
        # containing target village budgets. Here we scan all pages, but in
        # windows testing, a subset could be parsed if needed.
        for page in pdf.pages:
            text = page.extract_text() or ""

            # Detect Kecamatan / Kelurahan headers
            kec = re.search(r"[Kk]ecamatan\s*[:\-]?\s*([A-Za-z\s]+)", text)
            kel = re.search(r"[Kk]elurahan\s*[:\-]?\s*([A-Za-z\s]+)", text)

            if kec:
                name = kec.group(1).strip()
                if name and name.upper() != current_district_name:
                    current_district_name = name.upper()
                    current_district_id = _get_or_create_district(current_district_name)
                    current_village_id = None
                    current_village_name = ""
                    print(f"    Kecamatan: {current_district_name}")

            if kel and current_district_id:
                name = kel.group(1).strip()
                if name and name.upper() != current_village_name:
                    current_village_name = name.upper()
                    current_village_id = _get_or_create_village(
                        current_district_id, current_village_name
                    )
                    print(f"      Kelurahan: {current_village_name}")

            if not current_village_id:
                continue

            # Parse tables on this page
            for table in page.extract_tables() or []:
                for row in table:
                    if not row or len(row) < 3:
                        continue

                    program_desc = ""
                    raw_amount = ""

                    for cell in row:
                        if not cell:
                            continue
                        cell = str(cell).strip()
                        # heuristic: text cell (>10 chars, contains letters)
                        if len(cell) > 10 and re.search(r"[a-zA-Z]", cell):
                            program_desc = cell
                        # heuristic: amount cell (digits with thousand-separators)
                        elif re.fullmatch(r"[\d\.\s,]+", cell) and len(cell) > 3:
                            if len(cell) > len(raw_amount):
                                raw_amount = cell

                    if not program_desc or not raw_amount:
                        continue

                    sector = _classify_sector(program_desc)
                    if not sector:
                        continue

                    amount = _clean_amount(raw_amount)
                    if amount <= 0:
                        continue

                    sb.table("budgets").insert({
                        "village_id": current_village_id,
                        "sector": sector,
                        "program_name": program_desc[:500],
                        "allocation_amount": amount,
                        "fiscal_year": fiscal_year,
                    }).execute()
                    inserted += 1

    print(f"  [{fiscal_year}] Selesai - {inserted} baris anggaran disimpan.")
    return inserted


def run_pipeline():
    """Download all PDFs then extract & load each one."""
    paths = download_all()
    total = 0
    for year, path in sorted(paths.items()):
        print(f"\n{'='*60}")
        print(f"  Memproses APBD {year}")
        print(f"{'='*60}")
        total += extract_and_load(path, year)
    # Replaced unicode tick '✅' with simple text to prevent Windows cp1252 crash
    print(f"\nPipeline selesai - total {total} baris anggaran disimpan.")


if __name__ == "__main__":
    run_pipeline()
