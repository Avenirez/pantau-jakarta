"""Gemini API wrapper using native HTTP REST requests to avoid Google namespace library conflicts."""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

_API_KEY = os.getenv("GEMINI_API_KEY")

_SYSTEM_PROMPT = (
    "Kamu adalah jurnalis administrasi publik yang profesional namun mudah dipahami. "
    "Rangkum alokasi anggaran kelurahan ini menjadi narasi teks yang jelas, menarik, "
    "dan sopan untuk masyarakat umum dalam Bahasa Indonesia. "
    "Soroti ke mana potongan anggaran terbesar mengalir. "
    "Jangan gunakan jargon akuntansi yang rumit. Maksimal 200 kata."
)


def summarise_village_budget(
    village_name: str,
    district_name: str,
    budget_rows: list[dict],
) -> str:
    """
    Call Gemini 2.5 Flash using direct REST HTTP API.
    Bypasses google SDK import namespaces to prevent Windows environment conflicts.

    Args:
        village_name:  Kelurahan name
        district_name: Kecamatan name
        budget_rows:   list of dicts with ``sector``, ``program_name``, ``allocation_amount``

    Returns:
        Generated summary text, or a fallback message on failure.
    """
    if not _API_KEY:
        return "Ringkasan AI belum tersedia — GEMINI_API_KEY belum dikonfigurasi."

    total = sum(r.get("allocation_amount", 0) for r in budget_rows)
    lines = "\n".join(
        f"- {r['sector'].upper()}: {r['program_name']} — Rp {r['allocation_amount']:,}"
        for r in budget_rows
    )

    user_prompt = (
        f"[INSTRUKSI SISTEM]\n{_SYSTEM_PROMPT}\n\n"
        f"[DATA ANGGARAN KELURAHAN]\n"
        f"Kelurahan: {village_name}\n"
        f"Kecamatan: {district_name}\n"
        f"Total Anggaran: Rp {total:,}\n\n"
        f"Detail Program:\n{lines}\n\n"
        "Tolong buatkan ringkasan narasi publik sesuai dengan instruksi sistem di atas."
    )

    # Use gemini-2.5-flash as it is the default supported model for newly created API Keys
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={_API_KEY}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "contents": [{
            "parts": [{
                "text": user_prompt
            }]
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        response_data = response.json()
        
        if response.status_code == 200:
            # Extract content from standard Gemini REST response
            return response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        else:
            error_msg = response_data.get("error", {}).get("message", "Unknown API Error")
            return f"Gagal menghasilkan ringkasan untuk {village_name}: HTTP {response.status_code} - {error_msg}"
            
    except Exception as exc:
        return f"Gagal menghasilkan ringkasan untuk {village_name}: {exc}"
