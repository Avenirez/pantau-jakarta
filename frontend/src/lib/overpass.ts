export interface Facility {
  id: number;
  name: string;
  lat: number;
  lon: number;
  sector: "health" | "education" | "recreation" | "flood" | "public_services" | "mobility_economy";
  category: string; // e.g., 'Sekolah', 'Puskesmas', 'Taman', 'Rumah Pompa', 'Pos Damkar'
  amenityType: string;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (m) => m.toUpperCase());
}

export interface FetchFacilitiesResult {
  facilities: Facility[];
  center: [number, number] | null;
}

export async function fetchFacilitiesFromOSM(villageName: string): Promise<FetchFacilitiesResult> {
  const response = await fetch(`/api/villages/facilities?name=${encodeURIComponent(villageName)}`);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal memuat data dari OpenStreetMap (Status ${response.status})`);
  }

  const data = await response.json();
  return {
    facilities: data.facilities || [],
    center: data.center || null,
  };
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
