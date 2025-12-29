import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { DEFAULT_TIME_SLOT_TEMPLATES, DEFAULT_GUEST_TIER_TEMPLATES } from '@/lib/bookingTypes'

// POST /api/resorts/[id]/pricing/seed-defaults - Seed default time slots and guest tiers
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const cookieStore = cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    })
    
    // Verify authorization
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check resort ownership
    const { data: resort } = await supabase
      .from('resorts')
      .select('id, owner_id')
      .eq('id', resortId)
      .eq('owner_id', session.user.id)
      .single()
    
    if (!resort) {
      return NextResponse.json({ error: 'Not authorized to edit this resort' }, { status: 403 })
    }
    
    // Check if time slots already exist
    const { data: existingSlots } = await supabase
      .from('resort_time_slots')
      .select('id')
      .eq('resort_id', resortId)
      .limit(1)
    
    // Check if guest tiers already exist
    const { data: existingTiers } = await supabase
      .from('resort_guest_tiers')
      .select('id')
      .eq('resort_id', resortId)
      .limit(1)
    
    const results = { slotsSeeded: false, tiersSeeded: false }
    
    // Seed default time slots if none exist
    if (!existingSlots || existingSlots.length === 0) {
      const slotsToInsert = DEFAULT_TIME_SLOT_TEMPLATES.map(slot => ({
        resort_id: resortId,
        slot_type: slot.slot_type,
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        crosses_midnight: slot.crosses_midnight,
        hours: slot.hours,
        is_active: slot.is_active,
        sort_order: slot.sort_order,
      }))
      
      const { error: slotsError } = await supabase
        .from('resort_time_slots')
        .insert(slotsToInsert)
      
      if (slotsError) {
        console.error('Error seeding time slots:', slotsError)
      } else {
        results.slotsSeeded = true
      }
    }
    
    // Seed default guest tiers if none exist
    if (!existingTiers || existingTiers.length === 0) {
      const tiersToInsert = DEFAULT_GUEST_TIER_TEMPLATES.map(tier => ({
        resort_id: resortId,
        label: tier.label,
        min_guests: tier.min_guests,
        max_guests: tier.max_guests,
        is_active: tier.is_active,
        sort_order: tier.sort_order,
      }))
      
      const { error: tiersError } = await supabase
        .from('resort_guest_tiers')
        .insert(tiersToInsert)
      
      if (tiersError) {
        console.error('Error seeding guest tiers:', tiersError)
      } else {
        results.tiersSeeded = true
      }
    }
    
    // Enable advanced pricing
    await supabase
      .from('resorts')
      .update({ use_advanced_pricing: true })
      .eq('id', resortId)
    
    return NextResponse.json({
      success: true,
      message: 'Default settings seeded',
      ...results,
    })
  } catch (err) {
    console.error('Error seeding defaults:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
