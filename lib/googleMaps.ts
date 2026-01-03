/**
 * Google Maps integration for ResortifyPH
 * Provides geocoding, distance calculations, and map components
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

/**
 * Check if Google Maps API is available
 */
export function isGoogleMapsEnabled(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY)
}

/**
 * Get the Google Maps script URL
 */
export function getGoogleMapsScriptUrl(): string {
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`
}

/**
 * Geocode an address to coordinates using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{
  lat: number
  lng: number
  formattedAddress: string
  placeId?: string
  components?: {
    city?: string
    province?: string
    region?: string
    country?: string
  }
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ph&key=${GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      const location = result.geometry.location

      // Parse address components
      const components: { city?: string; province?: string; region?: string; country?: string } = {}
      for (const component of result.address_components) {
        const types = component.types
        if (types.includes('locality')) {
          components.city = component.long_name
        } else if (types.includes('administrative_area_level_2')) {
          components.province = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          components.region = component.long_name
        } else if (types.includes('country')) {
          components.country = component.long_name
        }
      }

      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        components,
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to address using Google Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  formattedAddress: string
  placeId?: string
  components?: {
    street?: string
    city?: string
    province?: string
    region?: string
    country?: string
    postalCode?: string
  }
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]

      // Parse address components
      const components: { street?: string; city?: string; province?: string; region?: string; country?: string; postalCode?: string } = {}
      for (const component of result.address_components) {
        const types = component.types
        if (types.includes('route') || types.includes('street_address')) {
          components.street = component.long_name
        } else if (types.includes('locality')) {
          components.city = component.long_name
        } else if (types.includes('administrative_area_level_2')) {
          components.province = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          components.region = component.long_name
        } else if (types.includes('country')) {
          components.country = component.long_name
        } else if (types.includes('postal_code')) {
          components.postalCode = component.long_name
        }
      }

      return {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        components,
      }
    }

    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Calculate precise distance between two points using Google Distance Matrix API
 * Returns driving distance and duration
 */
export async function calculateDrivingDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  distanceKm: number
  distanceText: string
  durationMinutes: number
  durationText: string
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0]
      return {
        distanceKm: element.distance.value / 1000,
        distanceText: element.distance.text,
        durationMinutes: Math.round(element.duration.value / 60),
        durationText: element.duration.text,
      }
    }

    return null
  } catch (error) {
    console.error('Distance calculation error:', error)
    return null
  }
}

/**
 * Batch calculate distances from one origin to multiple destinations
 * Note: Distance Matrix API allows up to 25 destinations per request
 */
export async function calculateBatchDistances(
  origin: { lat: number; lng: number },
  destinations: Array<{ id: string; lat: number; lng: number }>
): Promise<Map<string, { distanceKm: number; durationMinutes: number }>> {
  const results = new Map<string, { distanceKm: number; durationMinutes: number }>()

  if (!GOOGLE_MAPS_API_KEY || destinations.length === 0) {
    return results
  }

  // Process in batches of 25
  const batchSize = 25
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize)
    const destString = batch.map(d => `${d.lat},${d.lng}`).join('|')

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destString}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.rows[0]?.elements) {
        data.rows[0].elements.forEach((element: any, index: number) => {
          if (element.status === 'OK') {
            results.set(batch[index].id, {
              distanceKm: element.distance.value / 1000,
              durationMinutes: Math.round(element.duration.value / 60),
            })
          }
        })
      }
    } catch (error) {
      console.error('Batch distance calculation error:', error)
    }
  }

  return results
}

/**
 * Search for places using Google Places Autocomplete API
 * Enhanced to return full addresses like Google Maps website
 */
export async function searchPlaces(query: string): Promise<Array<{
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  fullAddress?: string
}>> {
  if (!GOOGLE_MAPS_API_KEY || !query.trim()) {
    return []
  }

  try {
    // Use Places Autocomplete with additional parameters for better results
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:ph&types=address|establishment|geocode&key=${GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.predictions) {
      return data.predictions.map((p: any) => ({
        placeId: p.place_id,
        // Use the full description from the prediction which includes full address
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        // Combine secondary text for fuller address display
        secondaryText: p.structured_formatting?.secondary_text || '',
        // Store the complete description as fullAddress
        fullAddress: p.description,
      }))
    }

    return []
  } catch (error) {
    console.error('Places search error:', error)
    return []
  }
}

/**
 * Get place details from Place ID
 */
export async function getPlaceDetails(placeId: string): Promise<{
  lat: number
  lng: number
  formattedAddress: string
  name?: string
  components?: {
    city?: string
    province?: string
    region?: string
  }
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name,address_components&key=${GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const result = data.result
      const components: { city?: string; province?: string; region?: string } = {}

      if (result.address_components) {
        for (const component of result.address_components) {
          const types = component.types
          if (types.includes('locality')) {
            components.city = component.long_name
          } else if (types.includes('administrative_area_level_2')) {
            components.province = component.long_name
          } else if (types.includes('administrative_area_level_1')) {
            components.region = component.long_name
          }
        }
      }

      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        name: result.name,
        components,
      }
    }

    return null
  } catch (error) {
    console.error('Place details error:', error)
    return null
  }
}

/**
 * Generate static map image URL
 */
export function getStaticMapUrl(
  lat: number,
  lng: number,
  options: {
    width?: number
    height?: number
    zoom?: number
    markers?: Array<{ lat: number; lng: number; color?: string; label?: string }>
  } = {}
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    return ''
  }

  const { width = 600, height = 300, zoom = 15, markers = [] } = options
  
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=roadmap&key=${GOOGLE_MAPS_API_KEY}`

  // Add markers
  if (markers.length > 0) {
    markers.forEach(m => {
      const color = m.color || 'red'
      const label = m.label || ''
      url += `&markers=color:${color}|label:${label}|${m.lat},${m.lng}`
    })
  } else {
    // Add center marker
    url += `&markers=color:red|${lat},${lng}`
  }

  return url
}
