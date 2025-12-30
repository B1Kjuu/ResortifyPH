import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: List payment submissions for a booking (owner only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')
  
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  try {
    const { data: submissions, error } = await supabase
      .from('payment_submissions')
      .select(`
        *,
        submitted_by_profile:profiles!submitted_by(full_name, email, avatar_url),
        verified_by_profile:profiles!verified_by(full_name, email)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ submissions })
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a payment submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { booking_id, amount, payment_method, reference_number, receipt_url, notes, user_id } = body

    if (!booking_id || !amount || !payment_method || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: submission, error } = await supabase
      .from('payment_submissions')
      .insert({
        booking_id,
        submitted_by: user_id,
        amount,
        payment_method,
        reference_number,
        receipt_url,
        notes,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({ payment_status: 'pending' })
      .eq('id', booking_id)

    return NextResponse.json({ submission })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Verify or reject a payment submission (owner only)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { submission_id, action, rejection_reason, user_id } = body

    if (!submission_id || !action || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get the submission to verify ownership
    const { data: submission, error: fetchError } = await supabase
      .from('payment_submissions')
      .select('*, booking:bookings(resort_id, resorts(owner_id))')
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify the user is the resort owner
    const resortData = (submission.booking as any)?.resorts
    if (!resortData || resortData.owner_id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the submission
    const updateData: any = {
      status: action === 'verify' ? 'verified' : 'rejected',
      verified_by: user_id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (action === 'reject' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { data: updated, error: updateError } = await supabase
      .from('payment_submissions')
      .update(updateData)
      .eq('id', submission_id)
      .select()
      .single()

    if (updateError) throw updateError

    // If verified, update booking payment status
    if (action === 'verify') {
      const { data: allSubmissions } = await supabase
        .from('payment_submissions')
        .select('amount')
        .eq('booking_id', submission.booking_id)
        .eq('status', 'verified')

      const totalPaid = (allSubmissions || []).reduce((sum, s) => sum + (s.amount || 0), 0) + submission.amount
      
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('id', submission.booking_id)
        .single()

      const newStatus = totalPaid >= (booking?.total_amount || 0) ? 'verified' : 'partial'

      await supabase
        .from('bookings')
        .update({ 
          payment_status: newStatus,
          amount_paid: totalPaid
        })
        .eq('id', submission.booking_id)
    }

    return NextResponse.json({ submission: updated })
  } catch (error: any) {
    console.error('Error updating payment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
