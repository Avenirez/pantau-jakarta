import { NextResponse } from "next/server";

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
  if (tags.waterway === "pumping_station" || tags.man_made === "pumping_station") return "Rumah Pompa";
  if (tags.amenity === "waste_disposal" || tags.amenity === "recycling") return "Pengolahan Sampah";
  if (tags.amenity === "fire_station") return "Pos Pemadam Kebakaran";
  if (tags.amenity === "police") return "Pos Polisi";
  if (tags.amenity === "townhall") return "Kantor Pemerintahan";
  if (tags.amenity === "community_centre") return "Balai Warga/RW";
  if (tags.amenity === "post_office") return "Kantor Pos";
  if (tags.amenity === "marketplace") return "Pasar Tradisional";
  if (tags.highway === "bus_stop" || tags.amenity === "bus_station") return "Pemberhentian Bus/Halte";
  if (tags.railway === "station") return "Stasiun Kereta";
  return "Fasilitas Publik";
}

function mapTagsToSectorAndCategory(tags: any): { 
  sector: "health" | "education" | "recreation" | "flood" | "public_services" | "mobility_economy"; 
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

  if (
    tags.waterway === "pumping_station" ||
    tags.man_made === "pumping_station" ||
    tags.amenity === "waste_disposal" ||
    tags.amenity === "recycling"
  ) {
    return { sector: "flood", category };
  }

  if (
    tags.amenity === "fire_station" ||
    tags.amenity === "police" ||
    tags.amenity === "townhall" ||
    tags.amenity === "community_centre" ||
    tags.amenity === "post_office"
  ) {
    return { sector: "public_services", category };
  }

  return { sector: "mobility_economy", category };
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
          "User-Agent": "PantauJakarta/1.0 (contact@pantaujakarta.org)",
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

    const query = `
      [out:json][timeout:25];
      relation["name"="${titleCaseName}"]["admin_level"~"7|8"]->.boundary;
      .boundary out center;
      area["name"="${titleCaseName}"]->.a;
      (
        nwr["amenity"~"school|kindergarten|college|university|library"](area.a);
        nwr["amenity"~"clinic|hospital|pharmacy|doctors"](area.a);
        nwr["leisure"~"park|playground|sports_centre|pitch"](area.a);
        nwr["waterway"="pumping_station"](area.a);
        nwr["man_made"="pumping_station"](area.a);
        nwr["amenity"~"waste_disposal|recycling"](area.a);
        nwr["amenity"~"fire_station|police|townhall|community_centre|post_office"](area.a);
        nwr["amenity"="marketplace"](area.a);
        nwr["highway"="bus_stop"](area.a);
        nwr["amenity"="bus_station"](area.a);
        nwr["railway"="station"](area.a);
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

    return NextResponse.json({ facilities, center });
  } catch (error: any) {
    console.error("Facilities API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
