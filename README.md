# PantauJakarta — Jakarta Digital Budget Transparency

Platform CivicTech yang mengubah dokumen PDF APBD Jakarta menjadi narasi publik yang mudah dipahami dan visualisasi data interaktif.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend API | Python · FastAPI |
| PDF Extraction | pdfplumber |
| Database | Supabase (PostgreSQL) |
| AI Summarization | Gemini 1.5 Flash (Free Tier) |
| Data Visualization | Plotly Express → JSON → react-plotly.js |
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| QRIS Donation | EMVCo TLV parser + QR Code generator |

## Struktur Folder

```
pantau-jakarta/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── budgets.py             # /api/districts, /api/villages, /api/dashboard
│   │   ├── charts.py              # /api/villages/{id}/chart
│   │   └── qris.py                # /api/donate/qris
│   ├── services/
│   │   ├── supabase_client.py     # Singleton DB client
│   │   ├── gemini_service.py      # AI summarization
│   │   ├── plotly_service.py      # Chart JSON generation
│   │   └── qris_service.py        # EMVCo QRIS dynamic amount
│   └── scripts/
│       ├── download_pdfs.py       # Auto-download APBD PDFs
│       ├── extract_pdf.py         # pdfplumber extraction pipeline
│       └── generate_summaries.py  # Batch Gemini summarization
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── globals.css
│   │   │   └── dashboard/[villageId]/page.tsx  # Village dashboard
│   │   ├── components/
│   │   │   ├── plotly-chart.tsx    # Dynamic import (SSR-safe)
│   │   │   ├── metric-card.tsx
│   │   │   └── qris-modal.tsx
│   │   └── lib/
│   │       └── api.ts             # Backend API helpers
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
└── database/
    └── migration.sql              # Supabase schema
```

## Quick Start

### 1. Database (Supabase)

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, paste isi `database/migration.sql`, klik **Run**.
3. Salin `Project URL` dan `API Key` dari **Settings → API**.

### 2. Backend (Python)

```bash
cd backend
cp .env.example .env               # edit dengan credentials kamu
pip install -r requirements.txt

# Download & extract APBD PDFs
python -m scripts.extract_pdf

# Generate AI summaries
python -m scripts.generate_summaries

# Start API server
uvicorn main:app --reload
```

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # pastikan NEXT_PUBLIC_API_URL benar
npm install
npm run dev
```

### 4. (Opsional tapi disarankan) Pre-warm cache fasilitas OSM

Sebelum publish ke publik, jalankan sekali supaya semua kelurahan sudah
punya cache fasilitas OpenStreetMap — visitor pertama pun langsung dapat
data cepat dari Supabase, tanpa menunggu live query ke Overpass API:

```bash
cd frontend
npm run prewarm-osm
```

Jalankan ulang secara berkala (mis. mingguan via cron) untuk me-refresh cache.


Buka `http://localhost:3000` di browser.

## API Endpoints

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/api/districts` | List semua Kecamatan |
| GET | `/api/districts/{id}/villages` | List Kelurahan per Kecamatan |
| GET | `/api/villages/{id}/dashboard` | Dashboard data lengkap (metrics, charts, narrative) |
| GET | `/api/villages/{id}/chart?year=2024` | Plotly chart JSON per Kelurahan |
| GET | `/api/donate/qris` | QR code PNG (Dynamic QRIS Rp5.000) |

## Data Source

Dokumen APBD Jakarta diunduh dari portal publik resmi:
- [apbd.jakarta.go.id/landingpage/doc](https://apbd.jakarta.go.id/landingpage/doc)
- Tahun anggaran: **2023, 2024, 2025**

## License

MIT — Proyek open-source untuk transparansi publik.
