import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/resorts/[id]/calculate-price?date=YYYY-MM-DD&slot_id=UUID&guest_count=N
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const slotId = searchParams.get('slot_id')
    const guestCount = parseInt(searchParams.get('guest_count') || '1', 10)
    
    if (!dateStr || !slotId) {
      return NextResponse.json({ error: 'date and slot_id parameters required' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Check resort settings
    const { data: resort } = await supabase
      .from('resorts')
      .select('id, downpayment_percentage, use_advanced_pricing, price')
      .eq('id', resortId)
      .single()
    
    if (!resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }
    
    // If not using advanced pricing, return the simple price
    if (!resort.use_advanced_pricing) {
      const simplePrice = resort.price || 0
      const downpayment = Math.round(simplePrice * (resort.downpayment_percentage || 50) / 100)
      
      return NextResponse.json({
        resortId,
        date: dateStr,
        useAdvancedPricing: false,
        totalPrice: simplePrice,
        downpaymentAmount: downpayment,
        downpaymentPercentage: resort.downpayment_percentage || 50,
      })
    }
    
    // Determine day type
    const date = new Date(dateStr)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Philippine holidays
    const holidays = [
      '2025-01-01', '2025-01-29', '2025-02-25', '2025-04-09', '2025-04-17',
      '2025-04-18', '2025-04-19', '2025-05-01', '2025-06-12', '2025-08-21',
      '2025-08-25', '2025-11-01', '2025-11-02', '2025-11-30', '2025-12-08',
      '2025-12-24', '2025-12-25', '2025-12-30', '2025-12-31',
    ]
    const isHoliday = holidays.includes(dateStr)
    const dayType = isWeekend || isHoliday ? 'weekend' : 'weekday'
    
    // Get the time slot
    const { data: timeSlot } = await supabase
      .from('resort_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('resort_id', resortId)
      .single()
    
    if (!timeSlot) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
    }
    
    // Find matching guest tier
    const { data: guestTiers } = await supabase
      .from('resort_guest_tiers')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('sort_order')
    
    if (!guestTiers || guestTiers.length === 0) {
      return NextResponse.json({ error: 'No guest tiers configured' }, { status: 400 })
    }
    
    const matchingTier = guestTiers.find(tier => {
      if (guestCount >= tier.min_guests) {
        if (tier.max_guests === null || guestCount <= tier.max_guests) {
          return true
        }
      }
      return false
    })
    
    if (!matchingTier) {
      return NextResponse.json({
        error: `No tier available for ${guestCount} guests`,
        availableTiers: guestTiers.map(t => ({ label: t.label, min: t.min_guests, max: t.max_guests })),
      }, { status: 400 })
    }
    
    // Get price from matrix
    const { data: priceEntry } = await supabase
      .from('resort_pricing_matrix')
      .select('price')
      .eq('resort_id', resortId)
      .eq('time_slot_id', slotId)
      .eq('guest_tier_id', matchingTier.id)
      .eq('day_type', dayType)
      .single()
    
    if (!priceEntry) {
      return NextResponse.json({
        error: 'Price not configured for this combination',
        details: {
          timeSlot: timeSlot.label,
          guestTier: matchingTier.label,
          dayType,
        },
      }, { status: 400 })
    }
    
    const totalPrice = priceEntry.price
    const downpaymentPct = resort.downpayment_percentage || 50
    const downpaymentAmount = Math.round(totalPrice * downpaymentPct / 100)
    
    return NextResponse.json({
      resortId,
      date: dateStr,
      useAdvancedPricing: true,
      timeSlot: {
        id: timeSlot.id,
        label: timeSlot.label,
        type: timeSlot.slot_type,
        startTime: timeSlot.start_time,
        endTime: timeSlot.end_time,
        hours: timeSlot.hours,
      },
      guestTier: {
        id: matchingTier.id,
        label: matchingTier.label,
        minGuests: matchingTier.min_guests,
        maxGuests: matchingTier.max_guests,
      },
      dayType,
      guestCount,
      totalPrice,
      downpaymentAmount,
      downpaymentPercentage: downpaymentPct,
    })
  } catch (err) {
    console.error('Error calculating price:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
