"""Mock QRIS donation route using a standard dummy QRIS payload (Production Version)."""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv

from services.qris_service import inject_amount, generate_qr_png

load_dotenv()
router = APIRouter(prefix="/api", tags=["qris"])

# Standard static QRIS dummy payload to avoid configuring .env during local testing
DUMMY_STATIC_QRIS = (
    "00020101021138590014ID.CO.DANA.WWW01189360091234567890120205123450303UME"
    "5204599953033605802ID5913PANTAUJAKARTA6007JAKARTA61051234562070703A016304D12A"
)

_STATIC_PAYLOAD = os.getenv("STATIC_QRIS_PAYLOAD", DUMMY_STATIC_QRIS)


@router.get("/donate/qris")
def donation_qris():
    """
    Generate a Dynamic QRIS locked at Rp 5,000 from the configured static payload.
    """
    try:
        dynamic = inject_amount(_STATIC_PAYLOAD, amount=5000)
        png_bytes = generate_qr_png(dynamic)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
