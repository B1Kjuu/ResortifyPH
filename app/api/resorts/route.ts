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

    // Get aggregated ratings efficiently using RPC if available, else simple query
    const resortIds = (resorts || []).map(r => r.id)
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
      resorts: resorts || [],
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
