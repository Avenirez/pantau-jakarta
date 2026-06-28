"""Gemini API wrapper — generates public-friendly budget narratives."""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

_API_KEY = os.getenv("GEMINI_API_KEY")
if _API_KEY:
    genai.configure(api_key=_API_KEY)

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
    Call Gemini 1.5 Flash (free tier) to produce a narrative summary.

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
        f"Kelurahan: {village_name}\n"
        f"Kecamatan: {district_name}\n"
        f"Total Anggaran: Rp {total:,}\n\n"
        f"Detail:\n{lines}\n\n"
        "Buatkan ringkasan narasi publik."
    )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=_SYSTEM_PROMPT,
        )
        response = model.generate_content(user_prompt)
        return response.text.strip()
    except Exception as exc:
        return f"Gagal menghasilkan ringkasan untuk {village_name}: {exc}"
