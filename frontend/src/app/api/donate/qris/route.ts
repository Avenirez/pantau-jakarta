import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * EMVCo-compliant QRIS Dynamic Amount generator.
 *
 * Parses a static QRIS TLV payload, injects Tag 54 (Transaction Amount),
 * recalculates the CRC-16/CCITT-FALSE checksum (Tag 63), and renders a QR PNG.
 *
 * This replaces the old FastAPI route (backend/routes/qris.py +
 * backend/services/qris_service.py), which never actually ran in
 * production since the Python backend was never deployed alongside
 * the Vercel frontend.
 *
 * ⚠ Educational / demo use — production QRIS generation requires ASPI certification.
 */

const DUMMY_STATIC_QRIS =
  "00020101021138590014ID.CO.DANA.WWW01189360091234567890120205123450303UME" +
  "5204599953033605802ID5913PANTAUJAKARTA6007JAKARTA61051234562070703A016304D12A";

const DONATION_AMOUNT = 5000;

function parseTlv(payload: string): [string, string][] {
  const entries: [string, string][] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const lengthStr = payload.slice(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);
    if (Number.isNaN(length)) break;
    const value = payload.slice(i + 4, i + 4 + length);
    entries.push([tag, value]);
    i += 4 + length;
  }
  return entries;
}

function buildTlv(entries: [string, string][]): string {
  return entries
    .map(([tag, value]) => `${tag}${String(value.length).padStart(2, "0")}${value}`)
    .join("");
}

// CRC-16 / CCITT-FALSE (poly 0x1021, init 0xFFFF)
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let idx = 0; idx < payload.length; idx++) {
    crc ^= payload.charCodeAt(idx) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function injectAmount(staticPayload: string, amount: number): string {
  const base =
    staticPayload.slice(-8, -4) === "6304" ? staticPayload.slice(0, -8) : staticPayload;

  const entries = parseTlv(base);
  const tagsMap = new Map<string, string>(entries);
  tagsMap.set("53", "360");
  tagsMap.set("54", String(amount));

  const ordered = Array.from(tagsMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const body = buildTlv(ordered);
  const bodyWithCrcStub = body + "6304";
  const checksum = crc16(bodyWithCrcStub);
  return bodyWithCrcStub + checksum;
}

export async function GET() {
  try {
    const staticPayload = process.env.STATIC_QRIS_PAYLOAD || DUMMY_STATIC_QRIS;
    const dynamicPayload = injectAmount(staticPayload, DONATION_AMOUNT);

    const pngBuffer = await QRCode.toBuffer(dynamicPayload, {
      errorCorrectionLevel: "M",
      margin: 4,
      scale: 10,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("QRIS generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate QRIS image" },
      { status: 500 }
    );
  }
}
