import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { queryOverpass } from "@/lib/overpass-server";

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

    // 1. Try cache lookup from Supabase first (fresh within 7 days)
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

    // 2. Try the permanent center stored on the village row (boundaries never
    //    change, so this skips a full relation query to Overpass entirely).
    let center: [number, number] | null = null;
    try {
      const { data: villageRow } = await supabase
        .from("villages")
        .select("center_lat, center_lon")
        .eq("name", cleanName.toUpperCase())
        .maybeSingle();

      if (villageRow?.center_lat && villageRow?.center_lon) {
        center = [villageRow.center_lat, villageRow.center_lon];
      }
    } catch (villageErr) {
      console.warn("Failed to read permanent village center:", villageErr);
    }

    // 3. If no stored center, fetch it from Overpass once and persist it.
    if (!center) {
      const relationQuery = `
        [out:json][timeout:8];
        relation["name"="${titleCaseName}"]["admin_level"~"7|8"];
        out center;
      `;

      try {
        const relationData = await queryOverpass(relationQuery);
        const relationEl = (relationData.elements || []).find((el: any) => el.type === "relation" && el.center);
        if (relationEl && relationEl.center) {
          center = [relationEl.center.lat, relationEl.center.lon];

          // Persist permanently so we never need to ask Overpass for this again.
          supabase
            .from("villages")
            .update({ center_lat: center[0], center_lon: center[1] })
            .eq("name", cleanName.toUpperCase())
            .then(({ error }) => {
              if (error) console.warn("Failed to persist village center:", error);
            });
        }
      } catch (relationErr) {
        console.warn("Failed to fetch relation center for", titleCaseName, relationErr);
      }
    }

    // 4. Query facilities using whichever center we ended up with.
    let query = "";
    if (center) {
      const [lat, lon] = center;
      query = `
        [out:json][timeout:12];
        (
          nwr["amenity"~"school|kindergarten|college|university|library"](around:1250,${lat},${lon});
          nwr["amenity"~"clinic|hospital|pharmacy|doctors"](around:1250,${lat},${lon});
          nwr["leisure"~"park|playground|sports_centre|pitch"](around:1250,${lat},${lon});
          nwr["amenity"~"fire_station|police|townhall|community_centre|post_office"](around:1250,${lat},${lon});
        );
        out center;
      `;
    } else {
      // Fallback to area query if we truly have no coordinates at all
      query = `
        [out:json][timeout:20];
        area["name"="${titleCaseName}"]->.a;
        (
          nwr["amenity"~"school|kindergarten|college|university|library"](area.a);
          nwr["amenity"~"clinic|hospital|pharmacy|doctors"](area.a);
          nwr["leisure"~"park|playground|sports_centre|pitch"](area.a);
          nwr["amenity"~"fire_station|police|townhall|community_centre|post_office"](area.a);
        );
        out center;
      `;
    }

    const data = await queryOverpass(query, 15000);
    if (!data.elements) {
      return NextResponse.json({ facilities: [], center });
    }
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

    // 5. Cache the result in Supabase asynchronously
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
