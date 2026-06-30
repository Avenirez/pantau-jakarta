import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Overpass API mirrors to cycle through if one fails
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://api-overpass.osm.ch/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

async function queryOverpassWithFallback(query: string): Promise<any> {
  let lastError = null;

  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "JakScope/1.0 (contact@jakscope.org)",
        },
        // Set a reasonable timeout (e.g. 8 seconds)
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        return await res.json();
      }
      lastError = new Error(`Overpass mirror ${url} returned status ${res.status}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`Overpass mirror ${url} failed:`, err.message || err);
    }
  }

  throw lastError || new Error("All Overpass API mirrors failed");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Query parameters 'lat' and 'lng' are required" },
        { status: 400 }
      );
    }

    const query = `
      [out:json][timeout:8];
      is_in(${lat},${lng})->.a;
      area.a["boundary"="administrative"]["admin_level"~"7|8"]->.b;
      .b out tags;
    `;

    const data = await queryOverpassWithFallback(query);
    const elements = data.elements || [];

    // Find elements with admin_level 7 or 8 (Kelurahan)
    const kelurahanEl = elements.find(
      (el: any) =>
        el.tags &&
        el.tags.name &&
        (el.tags.admin_level === "7" || el.tags.admin_level === "8")
    );

    if (!kelurahanEl || !kelurahanEl.tags || !kelurahanEl.tags.name) {
      return NextResponse.json(
        { error: "Koordinat berada di luar batas Kelurahan DKI Jakarta" },
        { status: 404 }
      );
    }

    const kelurahanName = kelurahanEl.tags.name.trim();
    const cleanName = kelurahanName.toUpperCase();

    // Query Supabase for the village ID and check if it has budgets
    const { data: dbData, error: dbError } = await supabase
      .from("villages")
      .select("id, name, budgets(id)")
      .eq("name", cleanName)
      .maybeSingle();

    if (dbError) {
      throw dbError;
    }

    if (!dbData) {
      return NextResponse.json(
        { error: `Kelurahan '${kelurahanName}' tidak terdaftar di database JakScope` },
        { status: 404 }
      );
    }

    if (!dbData.budgets || dbData.budgets.length === 0) {
      return NextResponse.json(
        { error: `Kelurahan '${kelurahanName}' terdeteksi, namun belum terintegrasi di sistem JakScope.` },
        { status: 400 }
      );
    }

    // 1. Try checking the cache in Supabase first to avoid calling Overpass API
    const titleCaseName = kelurahanName.toLowerCase().replace(/(?:^|\s|-)\S/g, (m: string) => m.toUpperCase());
    try {
      const { data: cacheData, error: cacheError } = await supabase
        .from("osm_facilities_cache")
        .select("facilities")
        .eq("village_name", titleCaseName)
        .maybeSingle();

      if (!cacheError && cacheData) {
        const facilities = cacheData.facilities || [];
        if (facilities.length === 0) {
          return NextResponse.json(
            { error: `Kelurahan '${kelurahanName}' tidak memiliki fasilitas publik terdaftar di OpenStreetMap (0 fasilitas).` },
            { status: 400 }
          );
        }
        // Cache exists and has facilities, proceed immediately!
        return NextResponse.json({ id: dbData.id, name: dbData.name });
      }
    } catch (cacheErr) {
      console.warn("Failed to check OSM facilities cache in detect route:", cacheErr);
    }

    // 2. If not in cache, query live Overpass
    const facilitiesQuery = `
      [out:json][timeout:8];
      (
        nwr["amenity"~"school|kindergarten|college|university|library"](around:1250,${lat},${lng});
        nwr["amenity"~"clinic|hospital|pharmacy|doctors"](around:1250,${lat},${lng});
        nwr["leisure"~"park|playground|sports_centre|pitch"](around:1250,${lat},${lng});
        nwr["amenity"~"fire_station|police|townhall|community_centre|post_office"](around:1250,${lat},${lng});
      );
      out count;
    `;

    try {
      const facilitiesData = await queryOverpassWithFallback(facilitiesQuery);
      const elements = facilitiesData.elements || [];
      const countEl = elements.find((el: any) => el.type === "count");
      const totalCount = countEl ? Number(countEl.tags?.total || 0) : 0;

      if (totalCount === 0) {
        return NextResponse.json(
          { error: `Kelurahan '${kelurahanName}' tidak memiliki fasilitas publik terdaftar di OpenStreetMap (0 fasilitas).` },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.warn("Failed to pre-check OSM facilities count, falling back to allow navigation:", err);
      // Graceful Fallback: If Overpass API is down or timing out, we DO NOT block the user.
      // We allow them to view the dashboard page anyway.
    }

    return NextResponse.json({ id: dbData.id, name: dbData.name });
  } catch (error: any) {
    console.error("Detect Kelurahan Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
