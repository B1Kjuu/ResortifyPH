import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Columns to select for resort listings (optimized - exclude large fields)
const RESORT_LIST_COLUMNS = `
  id,
  name,
  location,
  latitude,
  longitude,
  price,
  day_tour_price,
  night_tour_price,
  overnight_price,
  use_advanced_pricing,
  pricing_config,
  type,
  capacity,
  amenities,
  images,
  owner_id,
  status,
  created_at,
  region_code,
  region_name
`

// Helper function to extract minimum display price from pricing_config
function getDisplayPrice(resort: any): number | null {
  // If resort has a simple price, use it
  if (resort.price != null && resort.price > 0) {
    return resort.price
  }
  
  // Check pricing_config for advanced pricing (regardless of use_advanced_pricing flag)
  if (resort.pricing_config) {
    try {
      const config = typeof resort.pricing_config === 'string' 
        ? JSON.parse(resort.pricing_config) 
        : resort.pricing_config
      
      // Try to get prices from the pricing array
      if (config.pricing && Array.isArray(config.pricing)) {
        const prices = config.pricing
          .map((p: any) => p.price)
          .filter((p: any) => typeof p === 'number' && p > 0)
        
        if (prices.length > 0) {
          return Math.min(...prices)
        }
      }
    } catch (e) {
      console.error('Error parsing pricing_config:', e)
    }
  }
  
  // Fallback to legacy pricing fields
  const legacyPrices = [
    resort.day_tour_price,
    resort.night_tour_price,
    resort.overnight_price
  ].filter((p: any) => typeof p === 'number' && p > 0)
  
  if (legacyPrices.length > 0) {
    return Math.min(...legacyPrices)
  }
  
  return null
}

// Derive per-slot minimum prices from pricing_config or legacy fields
function getSlotPrices(resort: any): { daytour: number | null; overnight: number | null; '22hrs': number | null } {
  const slotPrices: { daytour: number | null; overnight: number | null; '22hrs': number | null } = {
    daytour: null,
    overnight: null,
    '22hrs': null,
  }

  // Try pricing_config first
  let pricingConfig = resort.pricing_config
  if (pricingConfig) {
    try {
      const cfg = typeof pricingConfig === 'string' ? JSON.parse(pricingConfig) : pricingConfig
      if (cfg?.pricing && Array.isArray(cfg.pricing)) {
        cfg.pricing.forEach((p: any) => {
          if (typeof p?.price === 'number' && p.price > 0 && slotPrices[p.bookingType as 'daytour' | 'overnight' | '22hrs'] !== undefined) {
            const key = p.bookingType as 'daytour' | 'overnight' | '22hrs'
            if (slotPrices[key] === null || p.price < slotPrices[key]!) {
              slotPrices[key] = p.price
            }
          }
        })
      }
    } catch (e) {
      console.error('Error parsing pricing_config for slot prices:', e)
    }
  }

  // Legacy fallback if missing
  if (slotPrices.daytour == null && resort.day_tour_price) slotPrices.daytour = resort.day_tour_price
  if (slotPrices.overnight == null && (resort.overnight_price || resort.night_tour_price)) slotPrices.overnight = resort.overnight_price || resort.night_tour_price
  if (slotPrices['22hrs'] == null && (resort.overnight_price || resort.night_tour_price)) slotPrices['22hrs'] = resort.overnight_price || resort.night_tour_price

  return slotPrices
}

// GET /api/resorts - Get paginated resorts with caching
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'approved'
    const offset = (page - 1) * limit

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get paginated resorts with optimized columns
    const { data: resorts, error, count } = await supabase
      .from('resorts')
      .select(RESORT_LIST_COLUMNS, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Resorts fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch resorts' }, { status: 500 })
    }

    // Process resorts - filter out those without any pricing configured
    const processedResorts = (resorts || [])
      .filter(resort => {
        // Check if resort has any pricing configured
        // Handle pricing_config which may be parsed JSON or a string
        let pricingConfig = resort.pricing_config
        if (typeof pricingConfig === 'string') {
          try {
            pricingConfig = JSON.parse(pricingConfig)
          } catch {
            pricingConfig = null
          }
        }
        
        const hasAdvancedPricing = pricingConfig?.pricing && Array.isArray(pricingConfig.pricing) && pricingConfig.pricing.length > 0
        const hasLegacyPricing = !!(resort.day_tour_price || resort.night_tour_price || resort.overnight_price || resort.price)
        
        // Only include resorts that have at least some pricing
        return hasAdvancedPricing || hasLegacyPricing
      })
      .map(resort => ({
        ...resort,
        // Ensure price field has a display value for map/cards and price filtering
        price: resort.price ?? getDisplayPrice(resort),
        slot_prices: getSlotPrices(resort),
        // Keep legacy pricing fields for ResortCard display
        day_tour_price: resort.day_tour_price,
        night_tour_price: resort.night_tour_price,
        overnight_price: resort.overnight_price,
        // Remove pricing_config from response to reduce payload size
        pricing_config: undefined,
      }))

    // Get aggregated ratings efficiently using RPC if available, else simple query
    const resortIds = processedResorts.map(r => r.id)
    let ratingsMap: Record<string, { avg: number; count: number }> = {}

    if (resortIds.length > 0) {
      const { data: ratingsData } = await supabase
        .from('reviews')
        .select('resort_id, rating')
        .in('resort_id', resortIds)

      ratingsMap = (ratingsData || []).reduce((acc: Record<string, { avg: number; count: number }>, row: { resort_id: string; rating: number }) => {
        const key = row.resort_id
        const cur = acc[key] || { avg: 0, count: 0 }
        cur.avg = ((cur.avg * cur.count) + (row.rating || 0)) / (cur.count + 1)
        cur.count = cur.count + 1
        acc[key] = cur
        return acc
      }, {})
    }

    const response = NextResponse.json({
      resorts: processedResorts,
      ratings: ratingsMap,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    })

    // Add cache headers - cache for 60 seconds, revalidate in background for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (err) {
    console.error('Error fetching resorts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
