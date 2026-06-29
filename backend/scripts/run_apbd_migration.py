import os
import sys

# Add backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_client import get_supabase
from scripts.download_pdfs import download_pdf
from scripts.extract_pdf import extract_and_load

def main():
    sb = get_supabase()
    
    # 1. Delete APBD 2023 data
    print("=== MENGHAPUS DATA APBD 2023 ===")
    try:
        res = sb.table("budgets").delete().eq("fiscal_year", 2023).execute()
        deleted_count = len(res.data) if res.data else 0
        print(f"Sukses menghapus {deleted_count} baris anggaran APBD 2023 dari database.")
    except Exception as e:
        print(f"Gagal menghapus data 2023: {e}")
        return

    # 2. Download APBD 2026 PDF
    print("\n=== MENGUNDUH APBD 2026 PDF ===")
    try:
        pdf_path = download_pdf(2026)
        print(f"Sukses mengunduh: {pdf_path}")
    except Exception as e:
        print(f"Gagal mengunduh PDF 2026: {e}")
        return

    # 3. Extract and load APBD 2026 data
    print("\n=== MENGEKSTRAK DAN MENGUNGGAH DATA APBD 2026 ===")
    try:
        inserted = extract_and_load(pdf_path, 2026)
        print(f"Sukses mengekstrak dan menyimpan {inserted} baris anggaran APBD 2026 ke database.")
    except Exception as e:
        print(f"Gagal mengekstrak/menyimpan data 2026: {e}")

if __name__ == "__main__":
    main()
