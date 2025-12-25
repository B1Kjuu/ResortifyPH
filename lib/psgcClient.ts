'use client'

// Lightweight client-side loader for official PSGC datasets stored under public/assets
// Builds a City -> Province map and exposes a cached accessor.

export type CityRecord = {
  citymunDesc: string
  provCode: string
}

export type ProvinceRecord = {
  provDesc: string
  provCode: string
}

let cityToProvinceCache: Map<string, string> | null = null

function normalizeKey(s: string) {
  return s
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function cleanCityName(raw: string) {
  // Examples: "CITY OF VIGAN (Capital)" -> "Vigan"
  // "CITY OF SAN FERNANDO (Capital)" -> "San Fernando"
  let s = raw.trim()
  s = s.replace(/^CITY OF\s+/i, '')
  s = s.replace(/\(Capital\)/i, '').trim()
  // Title case simple words
  s = s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return s
}

function cleanProvinceName(raw: string) {
  // Uppercase names to Title Case; keep content inside parentheses
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function getCityToProvinceMap(): Promise<Map<string, string>> {
  if (cityToProvinceCache) return cityToProvinceCache

  const [cityRes, provRes] = await Promise.all([
    fetch('/assets/refcitymun.json'),
    fetch('/assets/refprovince.json'),
  ])
  if (!cityRes.ok || !provRes.ok) {
    cityToProvinceCache = new Map()
    return cityToProvinceCache
  }
  const cityJson = await cityRes.json()
  const provJson = await provRes.json()

  const cities: CityRecord[] = (cityJson?.RECORDS || []).map((r: any) => ({
    citymunDesc: String(r.citymunDesc || ''),
    provCode: String(r.provCode || ''),
  }))
  const provinces: ProvinceRecord[] = (provJson?.RECORDS || []).map((r: any) => ({
    provDesc: String(r.provDesc || ''),
    provCode: String(r.provCode || ''),
  }))

  const provByCode = new Map<string, string>()
  provinces.forEach((p) => provByCode.set(String(p.provCode), cleanProvinceName(p.provDesc)))

  const map = new Map<string, string>()
  // Add cleaned names and normalized keys for matching
  cities.forEach((c) => {
    const cityClean = cleanCityName(c.citymunDesc)
    const provName = provByCode.get(c.provCode)
    if (!provName) return
    map.set(normalizeKey(cityClean), provName)
    // Also include the raw uppercase name as synonym
    map.set(normalizeKey(c.citymunDesc), provName)
  })

  cityToProvinceCache = map
  return cityToProvinceCache
}
