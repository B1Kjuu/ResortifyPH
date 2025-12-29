import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// GET /api/resorts/[id]/pricing - Get pricing configuration for a resort
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get resort basic info
    const { data: resort, error: resortError } = await supabase
      .from('resorts')
      .select('id, owner_id, downpayment_percentage, allow_split_day, use_advanced_pricing')
      .eq('id', resortId)
      .single()
    
    if (resortError || !resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }
    
    // Get time slots for this resort
    const { data: timeSlots, error: slotsError } = await supabase
      .from('resort_time_slots')
      .select('*')
      .eq('resort_id', resortId)
      .order('sort_order', { ascending: true })
    
    // Get guest tiers for this resort
    const { data: guestTiers, error: tiersError } = await supabase
      .from('resort_guest_tiers')
      .select('*')
      .eq('resort_id', resortId)
      .order('sort_order', { ascending: true })
    
    // Get pricing matrix for this resort
    const { data: pricingMatrix, error: pricingError } = await supabase
      .from('resort_pricing_matrix')
      .select('*')
      .eq('resort_id', resortId)
    
    return NextResponse.json({
      resortId: resort.id,
      ownerId: resort.owner_id,
      useAdvancedPricing: resort.use_advanced_pricing ?? false,
      allowSplitDay: resort.allow_split_day ?? true,
      downpaymentPercentage: resort.downpayment_percentage ?? 50,
      timeSlots: timeSlots || [],
      guestTiers: guestTiers || [],
      pricingMatrix: pricingMatrix || [],
    })
  } catch (err) {
    console.error('Error fetching pricing:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/resorts/[id]/pricing - Update pricing configuration for a resort
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resortId = params.id
    const body = await request.json()
    
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
    
    // Update resort-level settings
    const { error: resortUpdateError } = await supabase
      .from('resorts')
      .update({
        downpayment_percentage: body.downpaymentPercentage ?? 50,
        allow_split_day: body.allowSplitDay ?? true,
        use_advanced_pricing: body.useAdvancedPricing ?? false,
      })
      .eq('id', resortId)
    
    if (resortUpdateError) {
      console.error('Error updating resort:', resortUpdateError)
      return NextResponse.json({ error: 'Failed to update resort settings' }, { status: 500 })
    }
    
    // Update time slots
    if (body.timeSlots && Array.isArray(body.timeSlots)) {
      // Delete existing slots first
      await supabase
        .from('resort_time_slots')
        .delete()
        .eq('resort_id', resortId)
      
      // Insert new slots
      if (body.timeSlots.length > 0) {
        const slotsToInsert = body.timeSlots.map((slot: Record<string, unknown>, index: number) => ({
          resort_id: resortId,
          slot_type: slot.slot_type,
          label: slot.label,
          start_time: slot.start_time,
          end_time: slot.end_time,
          crosses_midnight: slot.crosses_midnight ?? false,
          hours: slot.hours,
          is_active: slot.is_active ?? true,
          sort_order: slot.sort_order ?? index + 1,
        }))
        
        const { error: slotsError } = await supabase
          .from('resort_time_slots')
          .insert(slotsToInsert)
        
        if (slotsError) {
          console.error('Error inserting time slots:', slotsError)
          return NextResponse.json({ error: 'Failed to save time slots' }, { status: 500 })
        }
      }
    }
    
    // Update guest tiers
    if (body.guestTiers && Array.isArray(body.guestTiers)) {
      // Delete existing tiers first
      await supabase
        .from('resort_guest_tiers')
        .delete()
        .eq('resort_id', resortId)
      
      // Insert new tiers
      if (body.guestTiers.length > 0) {
        const tiersToInsert = body.guestTiers.map((tier: Record<string, unknown>, index: number) => ({
          resort_id: resortId,
          label: tier.label,
          min_guests: tier.min_guests,
          max_guests: tier.max_guests,
          sort_order: tier.sort_order ?? index + 1,
          is_active: tier.is_active ?? true,
        }))
        
        const { error: tiersError } = await supabase
          .from('resort_guest_tiers')
          .insert(tiersToInsert)
        
        if (tiersError) {
          console.error('Error inserting guest tiers:', tiersError)
          return NextResponse.json({ error: 'Failed to save guest tiers' }, { status: 500 })
        }
      }
    }
    
    // Fetch the newly created slots and tiers to get their IDs for pricing matrix
    const { data: newSlots } = await supabase
      .from('resort_time_slots')
      .select('id, label')
      .eq('resort_id', resortId)
    
    const { data: newTiers } = await supabase
      .from('resort_guest_tiers')
      .select('id, label')
      .eq('resort_id', resortId)
    
    // Update pricing matrix (if provided with label-based mapping)
    if (body.pricingMatrix && Array.isArray(body.pricingMatrix)) {
      // Delete existing pricing
      await supabase
        .from('resort_pricing_matrix')
        .delete()
        .eq('resort_id', resortId)
      
      // Map labels to new IDs
      const slotLabelToId = new Map(newSlots?.map(s => [s.label, s.id]) || [])
      const tierLabelToId = new Map(newTiers?.map(t => [t.label, t.id]) || [])
      
      // Insert new pricing entries
      const pricingToInsert = body.pricingMatrix
        .map((entry: Record<string, unknown>) => {
          const slotId = entry.time_slot_id || slotLabelToId.get(entry.slot_label as string)
          const tierId = entry.guest_tier_id || tierLabelToId.get(entry.tier_label as string)
          
          if (!slotId || !tierId) return null
          
          return {
            resort_id: resortId,
            time_slot_id: slotId,
            guest_tier_id: tierId,
            day_type: entry.day_type,
            price: entry.price,
          }
        })
        .filter(Boolean)
      
      if (pricingToInsert.length > 0) {
        const { error: pricingError } = await supabase
          .from('resort_pricing_matrix')
          .insert(pricingToInsert)
        
        if (pricingError) {
          console.error('Error inserting pricing matrix:', pricingError)
          return NextResponse.json({ error: 'Failed to save pricing matrix' }, { status: 500 })
        }
      }
    }
    
    return NextResponse.json({ success: true, message: 'Pricing configuration saved' })
  } catch (err) {
    console.error('Error saving pricing:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
