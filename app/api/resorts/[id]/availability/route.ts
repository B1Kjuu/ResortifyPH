import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/resorts/[id]/availability?date=YYYY-MM-DD
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    
    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Check if resort uses advanced pricing
    const { data: resort } = await supabase
      .from('resorts')
      .select('id, use_advanced_pricing, allow_split_day, downpayment_percentage')
      .eq('id', resortId)
      .single()
    
    if (!resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }
    
    // Get time slots for this resort
    const { data: timeSlots } = await supabase
      .from('resort_time_slots')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('sort_order')
    
    if (!timeSlots || timeSlots.length === 0) {
      // Resort has no advanced pricing configured
      return NextResponse.json({
        resortId,
        date: dateStr,
        useAdvancedPricing: false,
        availableSlots: [],
      })
    }
    
    // Get existing bookings that overlap with this date
    // This includes: single-day bookings on this date AND multi-day bookings spanning this date
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, resort_time_slot_id, booking_type, status, date_from, date_to')
      .eq('resort_id', resortId)
      .lte('date_from', dateStr)  // Booking starts on or before this date
      .gte('date_to', dateStr)    // Booking ends on or after this date
      .in('status', ['pending', 'confirmed'])
    
    // Build availability map
    const bookedSlotIds = new Set(
      existingBookings?.map(b => b.resort_time_slot_id).filter(Boolean) || []
    )
    const bookedTypes = new Set(
      existingBookings?.map(b => b.booking_type).filter(Boolean) || []
    )
    
    // Check if there's a multi-day booking that blocks everything
    const hasMultiDayBooking = existingBookings?.some(b => b.date_from !== b.date_to) || false
    
    // Calculate availability for each slot
    const availableSlots = timeSlots.map(slot => {
      let isAvailable = true
      let reason = ''
      
      // Multi-day booking blocks everything on that date
      if (hasMultiDayBooking) {
        isAvailable = false
        reason = 'A multi-day booking covers this date'
      }
      // Check if this specific slot is booked
      else if (bookedSlotIds.has(slot.id)) {
        isAvailable = false
        reason = 'This time slot is already booked'
      }
      // Check if same type is booked
      else if (bookedTypes.has(slot.slot_type)) {
        isAvailable = false
        reason = `A ${slot.slot_type} booking already exists for this date`
      }
      // 22hrs blocks everything
      else if (bookedTypes.has('22hrs')) {
        isAvailable = false
        reason = 'A 22-hour booking blocks this date'
      }
      // 22hrs is blocked by anything
      else if (slot.slot_type === '22hrs' && bookedTypes.size > 0) {
        isAvailable = false
        reason = 'Cannot book 22 hours when other bookings exist'
      }
      // Check split day permission
      else if (!resort.allow_split_day) {
        if (slot.slot_type === 'daytour' && bookedTypes.has('overnight')) {
          isAvailable = false
          reason = 'Split day bookings not allowed'
        } else if (slot.slot_type === 'overnight' && bookedTypes.has('daytour')) {
          isAvailable = false
          reason = 'Split day bookings not allowed'
        }
      }
      
      return {
        slot_id: slot.id,
        slot_type: slot.slot_type,
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        hours: slot.hours,
        crosses_midnight: slot.crosses_midnight,
        is_available: isAvailable,
        unavailable_reason: isAvailable ? null : reason,
      }
    })
    
    // Determine day type for pricing
    const date = new Date(dateStr)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Philippine holidays (simplified - check migration for full list)
    const holidays = [
      '2025-01-01', '2025-01-29', '2025-02-25', '2025-04-09', '2025-04-17',
      '2025-04-18', '2025-04-19', '2025-05-01', '2025-06-12', '2025-08-21',
      '2025-08-25', '2025-11-01', '2025-11-02', '2025-11-30', '2025-12-08',
      '2025-12-24', '2025-12-25', '2025-12-30', '2025-12-31',
    ]
    const isHoliday = holidays.includes(dateStr)
    const dayType = isWeekend || isHoliday ? 'weekend' : 'weekday'
    
    return NextResponse.json({
      resortId,
      date: dateStr,
      dayType,
      useAdvancedPricing: resort.use_advanced_pricing ?? false,
      allowSplitDay: resort.allow_split_day ?? true,
      downpaymentPercentage: resort.downpayment_percentage ?? 50,
      availableSlots,
    })
  } catch (err) {
    console.error('Error checking availability:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
