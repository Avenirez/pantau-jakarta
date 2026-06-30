"""
PantauJakarta — FastAPI Entry Point.

Run with:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.budgets import router as budgets_router
from routes.charts import router as charts_router
from routes.qris import router as qris_router

app = FastAPI(
    title="JakScope API",
    description="Jakarta Public Facilities Mapping — Backend API Gateway",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(budgets_router)
app.include_router(charts_router)
app.include_router(qris_router)


@app.get("/")
def health():
    return {"status": "ok", "mode": "production", "service": "JakScope API"}
