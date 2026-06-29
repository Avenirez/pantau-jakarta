"""
Download APBD PDF documents from apbd.jakarta.go.id (public folder).

Targets: APBD 2023, 2024, 2025.
Files are saved to ./downloads/ and skipped if already present.
"""

import os
import urllib.parse
import requests

DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

PDF_SOURCES = {
    2023: "https://apbd.jakarta.go.id/doc/publik/6. APBD/APBD 2023/PENETAPAN 2023/PERDA/Lampiran 1 Perda APBD TA 2023.pdf",
    2024: "https://apbd.jakarta.go.id/doc/publik/6. APBD/APBD 2024/PENETAPAN/PERDA/Lampiran 1 Perda APBD TA 2024.pdf",
    2025: "https://apbd.jakarta.go.id/doc/publik/6. APBD/APBD 2025/PENETAPAN/PERDA/Lampiran 1 Perda APBD TA 2025.pdf",
    2026: "https://apbd.jakarta.go.id/doc/publik/6. APBD/APBD 2026/PENETAPAN/PERDA/Lampiran 1 Perda APBD 2026.pdf",
}


def _encode_url(raw_url: str) -> str:
    """Percent-encode the path component (spaces -> %20) while keeping the rest intact."""
    parts = urllib.parse.urlparse(raw_url)
    return urllib.parse.urlunparse(parts._replace(path=urllib.parse.quote(parts.path)))


def download_pdf(year: int) -> str:
    """Download the PDF for *year* and return the local file path."""
    url = PDF_SOURCES[year]
    dest = os.path.join(DOWNLOAD_DIR, f"apbd_{year}.pdf")

    if os.path.exists(dest):
        print(f"[{year}] Sudah ada: {dest}")
        return dest

    print(f"[{year}] Mengunduh dari {url} ...")
    resp = requests.get(_encode_url(url), stream=True, timeout=120)
    resp.raise_for_status()

    with open(dest, "wb") as fh:
        for chunk in resp.iter_content(8192):
            fh.write(chunk)

    size_mb = os.path.getsize(dest) / (1024 * 1024)
    # Replaced unicode arrow '->' to prevent Windows cp1252 encoding crashes
    print(f"[{year}] Selesai - {size_mb:.1f} MB - {dest}")
    return dest


def download_all() -> dict[int, str]:
    """Download all configured years. Returns ``{year: filepath}``."""
    results: dict[int, str] = {}
    for year in PDF_SOURCES:
        try:
            results[year] = download_pdf(year)
        except Exception as exc:
            print(f"[{year}] GAGAL: {exc}")
    return results


if __name__ == "__main__":
    download_all()
