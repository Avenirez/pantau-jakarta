"""
EMVCo-compliant QRIS Dynamic Amount Service.

Parses a static QRIS TLV payload, injects Tag 54 (Transaction Amount),
recalculates the CRC-16/CCITT-FALSE checksum (Tag 63), and generates a QR image.

⚠  Educational / demo use — production QRIS generation requires ASPI certification.
"""

import io
import struct
from typing import Optional
import qrcode


# ---------------------------------------------------------------------------
# TLV (Tag-Length-Value) parser for EMVCo QR payloads
# ---------------------------------------------------------------------------

def _parse_tlv(payload: str) -> list[tuple[str, str]]:
    """Parse an EMVCo TLV string into ordered (tag, value) pairs."""
    entries: list[tuple[str, str]] = []
    i = 0
    while i + 4 <= len(payload):
        tag = payload[i : i + 2]
        try:
            length = int(payload[i + 2 : i + 4])
        except ValueError:
            break
        value = payload[i + 4 : i + 4 + length]
        entries.append((tag, value))
        i += 4 + length
    return entries


def _build_tlv(entries: list[tuple[str, str]]) -> str:
    """Rebuild a TLV string from ordered (tag, value) pairs."""
    parts: list[str] = []
    for tag, value in entries:
        parts.append(f"{tag}{len(value):02d}{value}")
    return "".join(parts)


# ---------------------------------------------------------------------------
# CRC-16 / CCITT-FALSE  (poly 0x1021, init 0xFFFF)
# ---------------------------------------------------------------------------

def _crc16(payload: str) -> str:
    crc = 0xFFFF
    for ch in payload:
        crc ^= ord(ch) << 8
        for _ in range(8):
            crc = (crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def inject_amount(static_payload: str, amount: int = 5000) -> str:
    """
    Take a static QRIS payload, inject a fixed transaction amount, and return
    a new payload with a valid CRC.

    Steps:
    1. Strip existing CRC (Tag 63 — always last 8 chars).
    2. Parse remaining TLV entries.
    3. Insert / replace Tag 54 (Transaction Amount) with the given amount.
    4. Ensure Tag 53 (Transaction Currency = 360 for IDR) exists.
    5. Re-append Tag 63 with freshly calculated CRC-16.
    """
    # 1 — strip CRC
    base = static_payload[:-8] if static_payload[-8:-4] == "6304" else static_payload

    # 2 — parse
    entries = _parse_tlv(base)

    # 3 & 4 — ensure amount & currency tags
    tags_dict = {t: v for t, v in entries}
    tags_dict["53"] = "360"          # IDR
    tags_dict["54"] = str(amount)    # e.g. "5000"

    # Rebuild in tag-ascending order (EMVCo best practice)
    ordered = sorted(tags_dict.items(), key=lambda kv: kv[0])

    body = _build_tlv(ordered)
    body_with_crc_stub = body + "6304"
    checksum = _crc16(body_with_crc_stub)
    return body_with_crc_stub + checksum


def generate_qr_png(payload: str) -> bytes:
    """Render a QRIS payload string as a PNG image (bytes)."""
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    buf = io.BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
    return buf.getvalue()
