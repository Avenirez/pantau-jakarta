import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://api-overpass.osm.ch/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

// Helper helper function to map tags to sector labels
function getFriendlyCategoryName(tags: any): string {
  if (tags.amenity === "school" || tags.amenity === "kindergarten") return "Sekolah";
  if (tags.amenity === "college" || tags.amenity === "university") return "Universitas/Perguruan Tinggi";
  if (tags.amenity === "library") return "Perpustakaan";
  if (tags.amenity === "clinic" || tags.amenity === "hospital") return "Puskesmas/Klinik";
  if (tags.amenity === "pharmacy") return "Apotek";
  if (tags.amenity === "doctors") return "Praktek Dokter";
  if (tags.leisure === "park" || tags.leisure === "playground") return "Taman & RPTRA";
  if (tags.leisure === "sports_centre" || tags.leisure === "pitch") return "Fasilitas Olahraga";
  if (tags.amenity === "fire_station") return "Pos Pemadam Kebakaran";
  if (tags.amenity === "police") return "Pos Polisi";
  if (tags.amenity === "townhall") return "Kantor Pemerintahan";
  if (tags.amenity === "community_centre") return "Balai Warga/RW";
  if (tags.amenity === "post_office") return "Kantor Pos";
  return "Fasilitas Publik";
}

function mapTagsToSectorAndCategory(tags: any): { 
  sector: "health" | "education" | "recreation" | "public_services"; 
  category: string 
} {
  const category = getFriendlyCategoryName(tags);

  if (
    tags.amenity === "clinic" ||
    tags.amenity === "hospital" ||
    tags.amenity === "pharmacy" ||
    tags.amenity === "doctors"
  ) {
    return { sector: "health", category };
  }

  if (
    tags.amenity === "school" ||
    tags.amenity === "kindergarten" ||
    tags.amenity === "college" ||
    tags.amenity === "university" ||
    tags.amenity === "library"
  ) {
    return { sector: "education", category };
  }

  if (
    tags.leisure === "park" ||
    tags.leisure === "playground" ||
    tags.leisure === "sports_centre" ||
    tags.leisure === "pitch"
  ) {
    return { sector: "recreation", category };
  }

  return { sector: "public_services", category };
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (m) => m.toUpperCase());
}

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
        signal: AbortSignal.timeout(15000), // Larger timeout for facilities query
      });

      if (res.ok) {
        return await res.json();
      }
      lastError = new Error(`Overpass mirror ${url} returned status ${res.status}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`Overpass mirror ${url} failed for facilities:`, err.message || err);
    }
  }

  throw lastError || new Error("All Overpass API mirrors failed to retrieve facilities");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villageName = searchParams.get("name");

    if (!villageName) {
      return NextResponse.json(
        { error: "Query parameter 'name' is required" },
        { status: 400 }
      );
    }

    const cleanName = villageName.replace(/^kelurahan\s+/i, "").trim();
    const titleCaseName = toTitleCase(cleanName);

    // 1. Try cache lookup from Supabase first
    try {
      const { data: cacheData, error: cacheError } = await supabase
        .from("osm_facilities_cache")
        .select("facilities, center, updated_at")
        .eq("village_name", titleCaseName)
        .maybeSingle();

      if (!cacheError && cacheData) {
        const updatedAt = new Date(cacheData.updated_at).getTime();
        const now = new Date().getTime();
        const cacheAgeDays = (now - updatedAt) / (1000 * 60 * 60 * 24);

        if (cacheAgeDays < 7) {
          return NextResponse.json({
            facilities: cacheData.facilities,
            center: cacheData.center,
            _cached: true,
          });
        }
      }
    } catch (cacheErr) {
      console.warn("Failed to check OSM facilities cache in Supabase:", cacheErr);
    }

    const query = `
      [out:json][timeout:25];
      relation["name"="${titleCaseName}"]["admin_level"~"7|8"]->.boundary;
      .boundary out center;
      area["name"="${titleCaseName}"]->.a;
      (
        nwr["amenity"~"school|kindergarten|college|university|library"](area.a);
        nwr["amenity"~"clinic|hospital|pharmacy|doctors"](area.a);
        nwr["leisure"~"park|playground|sports_centre|pitch"](area.a);
        nwr["amenity"~"fire_station|police|townhall|community_centre|post_office"](area.a);
      );
      out center;
    `;

    const data = await queryOverpassWithFallback(query);
    if (!data.elements) {
      return NextResponse.json({ facilities: [], center: null });
    }

    let center: [number, number] | null = null;
    const facilities: any[] = [];

    data.elements.forEach((el: any) => {
      if (el.type === "relation" && el.center) {
        center = [el.center.lat, el.center.lon];
        return;
      }

      const tags = el.tags || {};
      const name = tags.name || tags.operator || `${getFriendlyCategoryName(tags)} (Tanpa Nama)`;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;

      if (!lat || !lon) return;

      const { sector, category } = mapTagsToSectorAndCategory(tags);

      facilities.push({
        id: el.id,
        name,
        lat,
        lon,
        sector,
        category,
        amenityType: tags.amenity || tags.leisure || tags.waterway || tags.highway || tags.railway || "unknown",
      });
    });

    // 2. Cache the result in Supabase asynchronously
    try {
      await supabase.from("osm_facilities_cache").upsert({
        village_name: titleCaseName,
        facilities,
        center,
        updated_at: new Date().toISOString()
      }, { onConflict: "village_name" });
    } catch (cacheErr) {
      console.warn("Failed to write OSM facilities cache to Supabase:", cacheErr);
    }

    return NextResponse.json({ facilities, center });
  } catch (error: any) {
    console.error("Facilities API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
