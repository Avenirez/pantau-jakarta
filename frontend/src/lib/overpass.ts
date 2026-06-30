export interface Facility {
  id: number;
  name: string;
  lat: number;
  lon: number;
  sector: "health" | "education" | "recreation" | "flood" | "public_services" | "mobility_economy";
  category: string; // e.g., 'Sekolah', 'Puskesmas', 'Taman', 'Rumah Pompa', 'Pos Damkar'
  amenityType: string;
}

export async function fetchFacilitiesFromOSM(villageName: string): Promise<Facility[]> {
  // Clean village name if it contains "Kelurahan" prefix
  const cleanName = villageName.replace(/^kelurahan\s+/i, "").trim();

  // Overpass QL query searching for all public facilities in the Kelurahan
  const query = `
    [out:json][timeout:25];
    area["name"~"${cleanName}",i]["admin_level"="8"]->.a;
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

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.elements) return [];

    const facilities: Facility[] = data.elements
      .map((el: any) => {
        const tags = el.tags || {};
        const name = tags.name || tags.operator || `${getFriendlyCategoryName(tags)} (Tanpa Nama)`;
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;

        if (!lat || !lon) return null;

        const { sector, category } = mapTagsToSectorAndCategory(tags);

        return {
          id: el.id,
          name,
          lat,
          lon,
          sector,
          category,
          amenityType: tags.amenity || tags.leisure || tags.waterway || tags.highway || tags.railway || "unknown",
        };
      })
      .filter((f: any): f is Facility => f !== null);

    return facilities;
  } catch (error) {
    console.error("Gagal mengambil data dari Overpass API:", error);
    return [];
  }
}

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

  // 1. Sektor Kesehatan (health)
  if (
    tags.amenity === "clinic" ||
    tags.amenity === "hospital" ||
    tags.amenity === "pharmacy" ||
    tags.amenity === "doctors"
  ) {
    return { sector: "health", category };
  }

  // 2. Sektor Pendidikan (education)
  if (
    tags.amenity === "school" ||
    tags.amenity === "kindergarten" ||
    tags.amenity === "college" ||
    tags.amenity === "university" ||
    tags.amenity === "library"
  ) {
    return { sector: "education", category };
  }

  // 3. Sektor Ruang Terbuka & Rekreasi (recreation)
  if (
    tags.leisure === "park" ||
    tags.leisure === "playground" ||
    tags.leisure === "sports_centre" ||
    tags.leisure === "pitch"
  ) {
    return { sector: "recreation", category };
  }

  // 4. Sektor Banjir & Sanitasi (flood)
  if (
    tags.waterway === "pumping_station" ||
    tags.man_made === "pumping_station" ||
    tags.amenity === "waste_disposal" ||
    tags.amenity === "recycling"
  ) {
    return { sector: "flood", category };
  }

  // 5. Sektor Keamanan & Administrasi Publik (public_services)
  if (
    tags.amenity === "fire_station" ||
    tags.amenity === "police" ||
    tags.amenity === "townhall" ||
    tags.amenity === "community_centre" ||
    tags.amenity === "post_office"
  ) {
    return { sector: "public_services", category };
  }

  // 6. Sektor Transportasi & Ekonomi Lokal (mobility_economy)
  return { sector: "mobility_economy", category };
}
