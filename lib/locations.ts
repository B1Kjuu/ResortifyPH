export type PhilippinesRegion = {
  code: string
  name: string
  provinces: string[]
}

export const PHILIPPINE_REGIONS: PhilippinesRegion[] = [
  {
    code: 'NCR',
    name: 'National Capital Region (NCR)',
    provinces: [
      'Metro Manila (NCR)',
      'Caloocan',
      'Las Piñas',
      'Makati',
      'Malabon',
      'Mandaluyong',
      'Manila',
      'Marikina',
      'Muntinlupa',
      'Navotas',
      'Parañaque',
      'Pasay',
      'Pasig',
      'Pateros',
      'Quezon City',
      'San Juan',
      'Taguig',
      'Valenzuela',
    ],
  },
  {
    code: 'CAR',
    name: 'Cordillera Administrative Region (CAR)',
    provinces: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province', 'Baguio'],
  },
  {
    code: 'I',
    name: 'Region I – Ilocos Region',
    provinces: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
  },
  {
    code: 'II',
    name: 'Region II – Cagayan Valley',
    provinces: ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
  },
  {
    code: 'III',
    name: 'Region III – Central Luzon',
    provinces: ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales', 'Angeles', 'Olongapo', 'Balanga', 'San Fernando (Pampanga)'],
  },
  {
    code: 'IV-A',
    name: 'Region IV-A – CALABARZON',
    provinces: ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal', 'Antipolo', 'Tagaytay', 'Calamba', 'Santa Rosa', 'San Pablo', 'Lipa', 'Batangas City', 'Lucena', 'Tayabas'],
  },
  {
    code: 'IV-B',
    name: 'Region IV-B – MIMAROPA',
    provinces: ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon', 'Puerto Princesa'],
  },
  {
    code: 'V',
    name: 'Region V – Bicol Region',
    provinces: ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
  },
  {
    code: 'VI',
    name: 'Region VI – Western Visayas',
    provinces: ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental', 'Iloilo City', 'Bacolod City'],
  },
  {
    code: 'VII',
    name: 'Region VII – Central Visayas',
    provinces: ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor', 'Cebu City', 'Mandaue', 'Lapu-Lapu', 'Dumaguete', 'Tagbilaran'],
  },
  {
    code: 'VIII',
    name: 'Region VIII – Eastern Visayas',
    provinces: ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar (Western Samar)', 'Southern Leyte', 'Tacloban', 'Ormoc'],
  },
  {
    code: 'IX',
    name: 'Region IX – Zamboanga Peninsula',
    provinces: ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Zamboanga City'],
  },
  {
    code: 'X',
    name: 'Region X – Northern Mindanao',
    provinces: ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental', 'Cagayan de Oro', 'Iligan'],
  },
  {
    code: 'XI',
    name: 'Region XI – Davao Region',
    provinces: ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Davao City'],
  },
  {
    code: 'XII',
    name: 'Region XII – SOCCSKSARGEN',
    provinces: ['Cotabato (North Cotabato)', 'Sarangani', 'South Cotabato', 'Sultan Kudarat', 'General Santos', 'Koronadal'],
  },
  {
    code: 'XIII',
    name: 'Region XIII – Caraga',
    provinces: ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur', 'Butuan', 'Surigao City'],
  },
  {
    code: 'BARMM',
    name: 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
    provinces: ['Basilan', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Sulu', 'Tawi-Tawi', 'Cotabato City', 'Marawi'],
  },
]

export const PHILIPPINE_PROVINCES = PHILIPPINE_REGIONS.flatMap((region) =>
  region.provinces.map((province) => ({
    regionCode: region.code,
    regionName: region.name,
    province,
  })),
)

/**
 * Province coordinates (approximate center points)
 * Used for distance calculations and "Near You" feature
 */
export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // NCR
  'Metro Manila (NCR)': { lat: 14.5995, lng: 120.9842 },
  // Key Cities
  'Antipolo': { lat: 14.6255, lng: 121.1245 },
  'Antipolo City': { lat: 14.6255, lng: 121.1245 },
  'Baguio': { lat: 16.4023, lng: 120.5960 },
  'Angeles': { lat: 15.1472, lng: 120.5849 },
  'Olongapo': { lat: 14.8292, lng: 120.2820 },
  'Balanga': { lat: 14.6780, lng: 120.5417 },
  'San Fernando (Pampanga)': { lat: 15.0333, lng: 120.6833 },
  'Tagaytay': { lat: 14.1159, lng: 120.9660 },
  'Calamba': { lat: 14.2117, lng: 121.1653 },
  'Santa Rosa': { lat: 14.3122, lng: 121.1119 },
  'San Pablo': { lat: 14.0697, lng: 121.3259 },
  'Lipa': { lat: 13.9394, lng: 121.1624 },
  'Batangas City': { lat: 13.7565, lng: 121.0583 },
  'Lucena': { lat: 13.9377, lng: 121.6172 },
  'Tayabas': { lat: 14.025, lng: 121.591 },
  'Puerto Princesa': { lat: 9.7392, lng: 118.7356 },
  'Iloilo City': { lat: 10.7202, lng: 122.5621 },
  'Bacolod City': { lat: 10.6765, lng: 122.9500 },
  'Cebu City': { lat: 10.3157, lng: 123.8854 },
  'Mandaue': { lat: 10.3322, lng: 123.9436 },
  'Lapu-Lapu': { lat: 10.3103, lng: 123.9495 },
  'Dumaguete': { lat: 9.3068, lng: 123.3055 },
  'Tagbilaran': { lat: 9.6526, lng: 123.8617 },
  'Tacloban': { lat: 11.2405, lng: 125.0040 },
  'Ormoc': { lat: 11.0060, lng: 124.6075 },
  'Zamboanga City': { lat: 6.9214, lng: 122.0790 },
  'Cagayan de Oro': { lat: 8.4542, lng: 124.6319 },
  'Iligan': { lat: 8.228, lng: 124.243 },
  'Davao City': { lat: 7.1907, lng: 125.4553 },
  'General Santos': { lat: 6.1128, lng: 125.1716 },
  'Koronadal': { lat: 6.499, lng: 124.846 },
  'Butuan': { lat: 8.949, lng: 125.543 },
  'Surigao City': { lat: 9.789, lng: 125.495 },
  'Cotabato City': { lat: 7.2236, lng: 124.2465 },
  'Marawi': { lat: 8.0034, lng: 124.2836 },
  'Legazpi': { lat: 13.1391, lng: 123.7438 },
  'Naga': { lat: 13.6214, lng: 123.1815 },
  'Vigan': { lat: 17.5747, lng: 120.3869 },
  // NCR Cities (LGUs)
  'Caloocan': { lat: 14.6500, lng: 120.9667 },
  'Las Piñas': { lat: 14.4445, lng: 120.9939 },
  'Makati': { lat: 14.5547, lng: 121.0244 },
  'Malabon': { lat: 14.6681, lng: 120.9563 },
  'Mandaluyong': { lat: 14.5794, lng: 121.0359 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Marikina': { lat: 14.6507, lng: 121.1029 },
  'Muntinlupa': { lat: 14.4081, lng: 121.0415 },
  'Navotas': { lat: 14.6667, lng: 120.9500 },
  'Parañaque': { lat: 14.4793, lng: 121.0198 },
  'Pasay': { lat: 14.5378, lng: 120.9876 },
  'Pasig': { lat: 14.5764, lng: 121.0851 },
  'Pateros': { lat: 14.5442, lng: 121.0669 },
  'Quezon City': { lat: 14.6760, lng: 121.0437 },
  'San Juan': { lat: 14.6025, lng: 121.0296 },
  'Taguig': { lat: 14.5176, lng: 121.0509 },
  'Valenzuela': { lat: 14.7010, lng: 120.9830 },
  // Common diacritic-free aliases
  'Las Pinas': { lat: 14.4445, lng: 120.9939 },
  'Paranaque': { lat: 14.4793, lng: 121.0198 },
  
  // CAR
  'Abra': { lat: 17.5951, lng: 120.7983 },
  'Apayao': { lat: 18.0119, lng: 121.1710 },
  'Benguet': { lat: 16.4023, lng: 120.5960 },
  'Ifugao': { lat: 16.8301, lng: 121.1710 },
  'Kalinga': { lat: 17.4766, lng: 121.3630 },
  'Mountain Province': { lat: 17.0467, lng: 121.1191 },
  
  // Region I – Ilocos
  'Ilocos Norte': { lat: 18.1647, lng: 120.7116 },
  'Ilocos Sur': { lat: 17.2028, lng: 120.5721 },
  'La Union': { lat: 16.6159, lng: 120.3209 },
  'Pangasinan': { lat: 15.8949, lng: 120.2863 },
  
  // Region II – Cagayan Valley
  'Batanes': { lat: 20.4487, lng: 121.9702 },
  'Cagayan': { lat: 18.2489, lng: 121.8787 },
  'Isabela': { lat: 16.9754, lng: 121.8107 },
  'Nueva Vizcaya': { lat: 16.3301, lng: 121.1710 },
  'Quirino': { lat: 16.4899, lng: 121.6578 },
  
  // Region III – Central Luzon
  'Aurora': { lat: 15.9786, lng: 121.6323 },
  'Bataan': { lat: 14.6417, lng: 120.4818 },
  'Bulacan': { lat: 14.8527, lng: 120.8163 },
  'Nueva Ecija': { lat: 15.5784, lng: 121.1113 },
  'Pampanga': { lat: 15.0794, lng: 120.6200 },
  'Tarlac': { lat: 15.4755, lng: 120.5963 },
  'Zambales': { lat: 15.5082, lng: 120.0690 },
  
  // Region IV-A – CALABARZON
  'Batangas': { lat: 13.7565, lng: 121.0583 },
  'Cavite': { lat: 14.2456, lng: 120.8786 },
  'Laguna': { lat: 14.1407, lng: 121.4692 },
  'Quezon': { lat: 14.0313, lng: 122.1106 },
  'Rizal': { lat: 14.6037, lng: 121.3084 },
  
  // Region IV-B – MIMAROPA
  'Marinduque': { lat: 13.4767, lng: 121.9032 },
  'Occidental Mindoro': { lat: 12.8797, lng: 120.9893 },
  'Oriental Mindoro': { lat: 12.9867, lng: 121.4064 },
  'Palawan': { lat: 9.8349, lng: 118.7384 },
  'Romblon': { lat: 12.5778, lng: 122.2694 },
  
  // Region V – Bicol
  'Albay': { lat: 13.1775, lng: 123.5280 },
  'Camarines Norte': { lat: 14.1390, lng: 122.7634 },
  'Camarines Sur': { lat: 13.6252, lng: 123.1826 },
  'Catanduanes': { lat: 13.7089, lng: 124.2421 },
  'Masbate': { lat: 12.3574, lng: 123.5504 },
  'Sorsogon': { lat: 12.9670, lng: 124.0050 },
  
  // Region VI – Western Visayas
  'Aklan': { lat: 11.8166, lng: 122.0942 },
  'Antique': { lat: 11.3682, lng: 122.0420 },
  'Capiz': { lat: 11.5881, lng: 122.7454 },
  'Guimaras': { lat: 10.5928, lng: 122.6325 },
  'Iloilo': { lat: 10.7202, lng: 122.5621 },
  'Negros Occidental': { lat: 10.2926, lng: 123.0247 },
  
  // Region VII – Central Visayas
  'Bohol': { lat: 9.8500, lng: 124.1435 },
  'Cebu': { lat: 10.3157, lng: 123.8854 },
  'Negros Oriental': { lat: 9.6169, lng: 123.0125 },
  'Siquijor': { lat: 9.1985, lng: 123.5950 },
  
  // Region VIII – Eastern Visayas
  'Biliran': { lat: 11.5839, lng: 124.4652 },
  'Eastern Samar': { lat: 11.6528, lng: 125.4082 },
  'Leyte': { lat: 10.3631, lng: 124.9614 },
  'Northern Samar': { lat: 12.2586, lng: 124.3962 },
  'Samar (Western Samar)': { lat: 11.7689, lng: 124.8854 },
  'Southern Leyte': { lat: 10.3367, lng: 125.1719 },
  
  // Region IX – Zamboanga Peninsula
  'Zamboanga del Norte': { lat: 8.1527, lng: 123.2577 },
  'Zamboanga del Sur': { lat: 7.8383, lng: 123.2969 },
  'Zamboanga Sibugay': { lat: 7.5222, lng: 122.8198 },
  
  // Region X – Northern Mindanao
  'Bukidnon': { lat: 8.0515, lng: 125.0990 },
  'Camiguin': { lat: 9.1732, lng: 124.7290 },
  'Lanao del Norte': { lat: 7.8721, lng: 123.8857 },
  'Misamis Occidental': { lat: 8.3375, lng: 123.7071 },
  'Misamis Oriental': { lat: 8.5046, lng: 124.6220 },
  
  // Region XI – Davao
  'Davao de Oro': { lat: 7.3117, lng: 126.1747 },
  'Davao del Norte': { lat: 7.5619, lng: 125.8087 },
  'Davao del Sur': { lat: 6.7656, lng: 125.3284 },
  'Davao Occidental': { lat: 6.1055, lng: 125.5830 },
  'Davao Oriental': { lat: 7.3172, lng: 126.5420 },
  
  // Region XII – SOCCSKSARGEN
  'Cotabato (North Cotabato)': { lat: 7.1435, lng: 124.8519 },
  'Sarangani': { lat: 5.9630, lng: 125.2367 },
  'South Cotabato': { lat: 6.2660, lng: 124.8517 },
  'Sultan Kudarat': { lat: 6.5069, lng: 124.4198 },
  
  // Region XIII – Caraga
  'Agusan del Norte': { lat: 8.9456, lng: 125.5319 },
  'Agusan del Sur': { lat: 8.1296, lng: 125.8877 },
  'Dinagat Islands': { lat: 10.1280, lng: 125.6083 },
  'Surigao del Norte': { lat: 9.7177, lng: 125.5950 },
  'Surigao del Sur': { lat: 8.7512, lng: 126.1378 },
  
  // BARMM
  'Basilan': { lat: 6.4221, lng: 121.9690 },
  'Lanao del Sur': { lat: 7.8232, lng: 124.4355 },
  'Maguindanao del Norte': { lat: 7.0547, lng: 124.3194 },
  'Maguindanao del Sur': { lat: 6.9423, lng: 124.2797 },
  'Sulu': { lat: 5.9749, lng: 121.0335 },
  'Tawi-Tawi': { lat: 5.1339, lng: 119.9509 },
}

/**
 * Get coordinates for a province
 */
export function getProvinceCoordinates(province?: string | null): { lat: number; lng: number } | null {
  if (!province) return null
  return PROVINCE_COORDINATES[province] || null
}

export function searchPhilippineProvinces(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return PHILIPPINE_PROVINCES
  }

  return PHILIPPINE_PROVINCES.filter((entry) =>
    entry.province.toLowerCase().includes(normalized) || entry.regionName.toLowerCase().includes(normalized),
  )
}

const PROVINCE_LOOKUP = new Map<string, (typeof PHILIPPINE_PROVINCES)[number]>(
  PHILIPPINE_PROVINCES.map((entry) => [entry.province.toLowerCase(), entry]),
)

export function getProvinceInfo(province?: string | null) {
  if (!province) return null
  const normalized = province.trim().toLowerCase()
  if (!normalized) return null
  return PROVINCE_LOOKUP.get(normalized) ?? null
}
