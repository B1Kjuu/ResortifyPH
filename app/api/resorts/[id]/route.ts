import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/resorts/[id] - Get single resort with caching
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id

    if (!resortId) {
      return NextResponse.json({ error: 'Resort ID required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get resort data
    const { data: resort, error } = await supabase
      .from('resorts')
      .select('*')
      .eq('id', resortId)
      .single()

    if (error || !resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }

    // Get owner info
    let owner = null
    if (resort.owner_id) {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', resort.owner_id)
        .maybeSingle()
      owner = ownerData
    }

    // Get aggregated reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('resort_id', resortId)

    const reviewCount = reviewsData?.length || 0
    const avgRating = reviewCount > 0
      ? reviewsData!.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount
      : 0

    // Get pricing config if advanced pricing enabled
    let pricingConfig = null
    if (resort.use_advanced_pricing) {
      const { data: timeSlots } = await supabase
        .from('resort_time_slots')
        .select('*')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('sort_order')

      const { data: guestTiers } = await supabase
        .from('resort_guest_tiers')
        .select('*')
        .eq('resort_id', resortId)
        .order('min_guests')

      if (timeSlots && timeSlots.length > 0) {
        pricingConfig = {
          timeSlots,
          guestTiers: guestTiers || [],
          enabledBookingTypes: [...new Set(timeSlots.map(s => s.slot_type))],
        }
      }
    }

    const response = NextResponse.json({
      resort,
      owner,
      rating: { avg: avgRating, count: reviewCount },
      pricingConfig,
    })

    // Cache for 2 minutes, revalidate in background for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600')

    return response
  } catch (err) {
    console.error('Error fetching resort:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
