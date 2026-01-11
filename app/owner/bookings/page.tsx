'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import OwnerBookingsContent from '../../../components/OwnerBookingsContent'
import { eachDayOfInterval } from 'date-fns'
import { toast as sonnerToast } from 'sonner'
import { getTimeSlotsForType } from '../../../lib/bookingTypes'

export default function OwnerBookingsPage(){
  type Toast = { message: string; type: 'success' | 'error' | '' }
  const [bookings, setBookings] = useState([] as any[])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [toast, setToast] = useState({ message: '', type: '' as Toast['type'] } as Toast)
  const [selectedResortId, setSelectedResortId] = useState('all')
  const [selectedDate, setSelectedDate] = useState(null as Date | null)
  const [selectedDayBookings, setSelectedDayBookings] = useState([] as any[])
  const [hoverTooltip, setHoverTooltip] = useState(null as { x: number, y: number, text: string } | null)
  const [selectedBookings, setSelectedBookings] = useState(new Set<string>())
  const [ownerResorts, setOwnerResorts] = useState<{ id: string; name: string }[]>([])
  const calendarRef = React.useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL query param
  const initialTab = useMemo(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['requests', 'calendar', 'confirmed', 'cancellations', 'history'].includes(tabParam)) {
      return tabParam as 'requests' | 'calendar' | 'confirmed' | 'cancellations' | 'history'
    }
    return undefined
  }, [searchParams])

  // Load owner's resorts for manual booking feature
  async function loadOwnerResorts(){
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, status')
        .eq('owner_id', userId)
        .in('status', ['approved', 'pending']) // Include pending for testing
      if (!error && data) {
        setOwnerResorts(data)
      }
    } catch (err) {
      console.error('Load resorts error:', err)
    }
  }

  async function loadOwnerBookings(){
    if (!userId) return

    try {
      // Use secure RPC to fetch bookings with guest details for the owner
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_owner_bookings')

      if (rpcError) {
        console.error('Owner bookings RPC error:', rpcError)
        setBookings([])
        return
      }

      // Map RPC rows to UI shape (RPC now includes verification fields)
      const enrichedBookings = (rpcData || []).map((row: any) => ({
        id: row.booking_id,
        resort_id: row.resort_id,
        guest_id: row.guest_id,
        date_from: row.date_from,
        date_to: row.date_to,
        guest_count: row.guest_count,
        children_count: row.children_count ?? 0,
        pets_count: row.pets_count ?? 0,
        booking_type: row.booking_type ?? null,
        status: row.status,
        created_at: row.created_at,
        // Cancellation fields (if present in RPC)
        cancellation_status: row.cancellation_status ?? null,
        cancellation_requested_at: row.cancellation_requested_at ?? null,
        cancellation_reason: row.cancellation_reason ?? null,
        // Payment verification fields
        payment_verified_at: row.payment_verified_at ?? null,
        payment_method: row.payment_method ?? null,
        payment_reference: row.payment_reference ?? null,
        verified_by: row.verified_by ?? null,
        verified_notes: row.verified_notes ?? null,
        resort: { id: row.resort_id, name: row.resort_name },
        guest: row.guest_id ? { id: row.guest_id, full_name: row.guest_full_name, email: row.guest_email } : null
      }))
      setBookings(enrichedBookings)
    } catch (err) {
      console.error('Load bookings error:', err)
      setBookings([])
    }
  }

  useEffect(() => {
    let mounted = true

    async function checkAuthAndLoad(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (!session?.user) {
          router.push('/auth/signin')
          return
        }

        // Proceed without fetching profile to avoid loops if RLS/policies error
        setUserId(session.user.id)
        setLoading(false)
      } catch (err) {
        console.error('Auth check error:', err)
        if (mounted) setLoading(false)
      }
    }

    checkAuthAndLoad()

    return () => { mounted = false }
  }, [router])

  // Auto-cancel expired pending bookings (past the start date)
  async function autoCancelExpiredBookings() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    // Find pending bookings where date_from is before today
    const expiredPending = bookings.filter(b => 
      b.status === 'pending' && 
      b.date_from && 
      b.date_from < todayStr
    )
    
    if (expiredPending.length === 0) return
    
    // Update them to 'expired' status
    const expiredIds = expiredPending.map(b => b.id)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'expired' })
        .in('id', expiredIds)
      
      if (!error) {
        sonnerToast.info(`${expiredIds.length} expired pending booking(s) auto-cancelled`, {
          description: 'Bookings past their start date have been marked as expired.'
        })
        loadOwnerBookings()
      }
    } catch (err) {
      console.error('Auto-cancel expired bookings error:', err)
    }
  }

  // Load bookings when userId is set
  useEffect(() => {
    if (!userId) return

    loadOwnerBookings()
    loadOwnerResorts()

    // Subscribe to real-time changes with simple debounce to avoid bursts
    let refreshTimer: NodeJS.Timeout | null = null
    const subscription = supabase
      .channel('owner_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => {
            loadOwnerBookings()
          }, 250)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  // Check for expired pending bookings after bookings are loaded
  useEffect(() => {
    if (bookings.length > 0 && !loading) {
      autoCancelExpiredBookings()
    }
  }, [bookings.length, loading])

  async function confirmBooking(bookingId: string){
    try {
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert optimistic update on error
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'pending' } : b))
      } else {
        setToast({ message: 'Booking confirmed!', type: 'success' })
        // rely on realtime to refresh; as a fallback, refresh after a short delay
        setTimeout(() => loadOwnerBookings(), 500)
        try {
          const booking = bookings.find(b => b.id === bookingId)
          if (booking?.guest?.id) {
            const { notify } = await import('../../../lib/notifications')
            await notify({
              userId: booking.guest.id,
              type: 'booking_confirmed',
              title: 'Your booking was confirmed',
              body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
              link: `/guest/trips/${bookingId}`,
              metadata: { bookingId }
            })
          }
          // Email guest confirmation
          try {
            if (booking?.guest?.email) {
              const { data: { session } } = await supabase.auth.getSession()
              await fetch('/api/notifications/booking-status', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  to: booking.guest.email,
                  status: 'approved',
                  resortName: booking.resort?.name || 'Your booking',
                  dateFrom: booking.date_from,
                  dateTo: booking.date_to,
                  link: `/chat/${bookingId}?as=guest`,
                  bookingId,
                  actorUserId: userId,
                  recipientUserId: booking.guest.id,
                })
              })
            }
          } catch (e) { console.warn('Email confirm failed:', e) }
          // Insert a system message into the booking chat thread
          await insertSystemMessageForBooking(bookingId, `✅ Booking confirmed for ${booking.resort?.name || 'Resort'} — ${booking.date_from} → ${booking.date_to}`)
        } catch (e) { console.warn('Notify failed:', e) }
      }
    } catch (err) {
      setToast({ message: 'Error confirming booking', type: 'error' })
    }
  }

  async function rejectBooking(bookingId: string){
    try {
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert optimistic update on error
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'pending' } : b))
      } else {
        setToast({ message: 'Booking rejected', type: 'success' })
        // rely on realtime to refresh; as a fallback, refresh after a short delay
        setTimeout(() => loadOwnerBookings(), 500)
        try {
          const booking = bookings.find(b => b.id === bookingId)
          if (booking?.guest?.id) {
            const { notify } = await import('../../../lib/notifications')
            await notify({
              userId: booking.guest.id,
              type: 'booking_rejected',
              title: 'Your booking was rejected',
              body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
              link: `/guest/trips/${bookingId}`,
              metadata: { bookingId }
            })
          }
          // Email guest rejection
          try {
            if (booking?.guest?.email) {
              const { data: { session } } = await supabase.auth.getSession()
              await fetch('/api/notifications/booking-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  to: booking.guest.email,
                  status: 'rejected',
                  resortName: booking.resort?.name || 'Your booking',
                  dateFrom: booking.date_from,
                  dateTo: booking.date_to,
                  link: `/chat/${bookingId}?as=guest`,
                  bookingId,
                  actorUserId: userId,
                  recipientUserId: booking.guest.id,
                })
              })
            }
          } catch (e) { console.warn('Email reject failed:', e) }
          // Insert a system message into the booking chat thread
          await insertSystemMessageForBooking(bookingId, `❌ Booking rejected for ${booking.resort?.name || 'Resort'} — ${booking.date_from} → ${booking.date_to}`)
        } catch (e) { console.warn('Notify failed:', e) }
      }
    } catch (err) {
      setToast({ message: 'Error rejecting booking', type: 'error' })
    }
  }

  // Approve guest cancellation request: mark booking cancelled and set status accordingly
  async function approveCancellation(bookingId: string){
    try {
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', cancellation_status: 'approved' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancellation_status: 'approved' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert
        loadOwnerBookings()
      } else {
        setToast({ message: 'Cancellation approved', type: 'success' })
        try {
          const booking = bookings.find(b => b.id === bookingId)
          if (booking?.guest?.id) {
            const { notify } = await import('../../../lib/notifications')
            await notify({
              userId: booking.guest.id,
              type: 'cancellation_approved',
              title: 'Your cancellation was approved',
              body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
              link: `/guest/trips/${bookingId}`,
              metadata: { bookingId }
            })
          }
          await insertSystemMessageForBooking(bookingId, `🛑 Cancellation approved — ${booking?.resort?.name || 'Resort'} (${booking?.date_from} → ${booking?.date_to})`)
        } catch (e) { console.warn('Notify failed:', e) }
      }
    } catch (err) {
      setToast({ message: 'Error approving cancellation', type: 'error' })
    }
  }

  // Decline guest cancellation request: keep booking confirmed but mark declined
  async function declineCancellation(bookingId: string){
    try {
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, cancellation_status: 'declined' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ cancellation_status: 'declined' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert
        loadOwnerBookings()
      } else {
        setToast({ message: 'Cancellation declined', type: 'success' })
        try {
          const booking = bookings.find(b => b.id === bookingId)
          if (booking?.guest?.id) {
            const { notify } = await import('../../../lib/notifications')
            await notify({
              userId: booking.guest.id,
              type: 'cancellation_declined',
              title: 'Your cancellation was declined',
              body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
              link: `/guest/trips/${bookingId}`,
              metadata: { bookingId }
            })
          }
          await insertSystemMessageForBooking(bookingId, `↩️ Cancellation declined — ${booking?.resort?.name || 'Resort'} (${booking?.date_from} → ${booking?.date_to})`)
        } catch (e) { console.warn('Notify failed:', e) }
      }
    } catch (err) {
      setToast({ message: 'Error declining cancellation', type: 'error' })
    }
  }

  async function deleteBooking(bookingId: string){
    try {
      const ok = typeof window !== 'undefined' ? window.confirm('Delete this booking request? This cannot be undone.') : true
      if (!ok) return
      // Optimistic removal
      setBookings(prev => prev.filter(b => b.id !== bookingId))
      setSelectedBookings(prev => {
        const next = new Set(prev)
        next.delete(bookingId)
        return next
      })
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert by reloading
        loadOwnerBookings()
      } else {
        setToast({ message: 'Booking deleted', type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Error deleting booking', type: 'error' })
    }
  }

  async function togglePaymentVerified(bookingId: string, verified: boolean){
    try {
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_verified_at: verified ? new Date().toISOString() : null } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ payment_verified_at: verified ? new Date().toISOString() : null })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // revert
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_verified_at: !verified ? new Date().toISOString() : null } : b))
      } else {
        setToast({ message: verified ? 'Payment marked verified' : 'Payment verification cleared', type: 'success' })
        if (verified) {
          try {
            const booking = bookings.find(b => b.id === bookingId)
            if (booking?.guest?.id) {
              const { notify } = await import('../../../lib/notifications')
              await notify({
                userId: booking.guest.id,
                type: 'payment_verified',
                title: 'Payment marked verified',
                body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
                link: `/guest/trips/${bookingId}`,
                metadata: { bookingId }
              })
            }
          } catch (e) { console.warn('Notify failed:', e) }
        }
      }
    } catch (err) {
      setToast({ message: 'Error updating payment verification', type: 'error' })
    }
  }

  async function bulkDeleteBookings(){
    if (selectedBookings.size === 0) return
    const ok = typeof window !== 'undefined' ? window.confirm(`Delete ${selectedBookings.size} booking request(s)? This cannot be undone.`) : true
    if (!ok) return

    try {
      const idsToDelete = Array.from(selectedBookings)
      // Optimistic removal
      setBookings(prev => prev.filter(b => !selectedBookings.has(b.id)))
      setSelectedBookings(new Set())
      
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', idsToDelete)
      
      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        loadOwnerBookings()
      } else {
        setToast({ message: `${idsToDelete.length} booking(s) deleted`, type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Error deleting bookings', type: 'error' })
      loadOwnerBookings()
    }
  }

  async function updateVerificationDetails(bookingId: string, details: { method?: string; reference?: string; notes?: string }){
    try {
      // Build partial payload only for provided fields to avoid null overwrites
      const payload: any = { verified_by: userId || null }
      const optimistic: any = {}
      if (Object.prototype.hasOwnProperty.call(details, 'method')) {
        payload.payment_method = details.method
        optimistic.payment_method = details.method
      }
      if (Object.prototype.hasOwnProperty.call(details, 'reference')) {
        payload.payment_reference = details.reference
        optimistic.payment_reference = details.reference
      }
      if (Object.prototype.hasOwnProperty.call(details, 'notes')) {
        payload.verified_notes = details.notes
        optimistic.verified_notes = details.notes
      }

      // Optimistic update
      setBookings(prev => prev.map(b => b.id === bookingId ? {
        ...b,
        ...optimistic,
        verified_by: userId || b.verified_by || null,
      } : b))

      const { error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        // reload to revert
        loadOwnerBookings()
      } else {
        setToast({ message: 'Verification details saved', type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Error saving verification details', type: 'error' })
    }
  }

  // Owner-side cancel for confirmed bookings
  async function cancelBooking(bookingId: string){
    try {
      const ok = typeof window !== 'undefined' ? window.confirm('Cancel this confirmed booking?') : true
      if (!ok) return
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', cancellation_status: 'approved' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancellation_status: 'approved' })
        .eq('id', bookingId)
        .eq('status', 'confirmed')
      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        loadOwnerBookings()
        return
      }
      setToast({ message: 'Booking cancelled', type: 'success' })
      try {
        const booking = bookings.find(b => b.id === bookingId)
        if (booking?.guest?.id) {
          const { notify } = await import('../../../lib/notifications')
          await notify({
            userId: booking.guest.id,
            type: 'owner_cancelled',
            title: 'Your booking was cancelled by host',
            body: `${booking.resort?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
            link: `/guest/trips/${bookingId}`,
            metadata: { bookingId }
          })
        }
        await insertSystemMessageForBooking(bookingId, `🛑 Host cancelled booking — ${booking?.resort?.name || 'Resort'} (${booking?.date_from} → ${booking?.date_to})`)
      } catch (e) { console.warn('Notify failed:', e) }
    } catch (err) {
      setToast({ message: 'Error cancelling booking', type: 'error' })
    }
  }

  // Helper: insert system message into chat for a booking
  async function insertSystemMessageForBooking(bookingId: string, content: string){
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const senderId = session?.user?.id
      if (!senderId) return
      const { data: chatRow } = await supabase
        .from('chats')
        .select('id')
        .eq('booking_id', bookingId)
        .limit(1)
        .maybeSingle()
      const chatId = (chatRow as any)?.id
      if (!chatId) return
      await supabase.from('chat_messages').insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
      } as any)
    } catch (e) {
      console.warn('Insert system message failed:', e)
    }
  }

  // Add manual booking for dates booked before using the platform
  async function addManualBooking(data: { resort_id: string; date_from: string; date_to: string; guest_name: string; guest_count: number; notes: string; booking_type: 'daytour' | 'overnight' | '22hrs'; time_slot_id?: string; check_in_time?: string; check_out_time?: string }){
    if (!userId) {
      setToast({ message: 'You must be logged in', type: 'error' })
      return
    }

    try {
      const defaultSlot = getTimeSlotsForType(data.booking_type)?.[0]
      const timeSlotId = data.time_slot_id || defaultSlot?.id || null
      const checkIn = data.check_in_time || defaultSlot?.startTime || null
      const checkOut = data.check_out_time || defaultSlot?.endTime || null

      const insertPayloadBase: any = {
        resort_id: data.resort_id,
        date_from: data.date_from,
        date_to: data.date_to,
        guest_count: Math.max(1, Number(data.guest_count) || 1),
        booking_type: data.booking_type,
        time_slot_id: timeSlotId,
        check_in_time: checkIn,
        check_out_time: checkOut,
        status: 'confirmed',
        verified_notes: data.guest_name
          ? `External booking: ${data.guest_name}${data.notes ? ' - ' + data.notes : ''}`
          : (data.notes || 'External booking (made before platform)'),
        payment_verified_at: new Date().toISOString(),
        verified_by: userId,
      }

      // Preferred: NULL guest_id so it doesn't become a "self" booking
      let { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({ ...insertPayloadBase, guest_id: null })
        .select()
        .single()

      // Fallback (for older DB policies/RPCs): attach to owner to pass RLS and appear in RPC lists
      if (error) {
        const msg = String((error as any)?.message || '')
        const looksLikeRls = msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')
        const looksLikeJoinOrPolicy = msg.toLowerCase().includes('violates') || msg.toLowerCase().includes('permission')
        if (looksLikeRls || looksLikeJoinOrPolicy) {
          const retry = await supabase
            .from('bookings')
            .insert({ ...insertPayloadBase, guest_id: userId })
            .select()
            .single()
          newBooking = retry.data as any
          error = retry.error as any
          if (!error) {
            sonnerToast.warning('Added booking, but DB migration needed', {
              description: 'Apply the latest Supabase migration to avoid self-chat/self-booking behavior for external bookings.'
            })
          }
        }
      }

      if (error) {
        console.error('Manual booking error:', error)
        const msg = String((error as any)?.message || '')
        const lower = msg.toLowerCase()
        const isOverlapConstraint = lower.includes('bookings_no_overlap') || lower.includes('exclusion') || lower.includes('overlap')

        if (isOverlapConstraint) {
          setToast({ message: 'Error: Dates conflict with an existing booking (or DB overlap constraint is still enabled).', type: 'error' })
          sonnerToast.error('Dates conflict (overlap)', {
            description: 'If you expect Day Tour + Overnight to coexist, apply the latest Supabase migration that drops bookings_no_overlap.'
          })
        } else {
          setToast({ message: `Error: ${msg}`, type: 'error' })
          sonnerToast.error('Failed to add booking')
        }
        return
      }

      setToast({ message: 'Booking added successfully!', type: 'success' })
      sonnerToast.success('External booking added to calendar')
      loadOwnerBookings()
    } catch (err) {
      console.error('Add manual booking error:', err)
      setToast({ message: 'Error adding booking', type: 'error' })
      sonnerToast.error('Failed to add booking')
    }
  }

  function toggleSelectAll(bookingsList: any[]){
    const allIds = bookingsList.map(b => b.id)
    const allSelected = allIds.every(id => selectedBookings.has(id))
    if (allSelected) {
      setSelectedBookings(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedBookings(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  function toggleSelect(bookingId: string){
    setSelectedBookings(prev => {
      const next = new Set(prev)
      if (next.has(bookingId)) {
        next.delete(bookingId)
      } else {
        next.add(bookingId)
      }
      return next
    })
  }

  async function bulkApproveCancellations(){
    const ids = bookings.filter(b => selectedBookings.has(b.id) && b.cancellation_status === 'requested').map(b => b.id)
    if (ids.length === 0) return
    const ok = typeof window !== 'undefined' ? window.confirm(`Approve cancellation for ${ids.length} booking(s)?`) : true
    if (!ok) return
    try {
      setBookings(prev => prev.map(b => ids.includes(b.id) ? { ...b, status: 'cancelled', cancellation_status: 'approved' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancellation_status: 'approved' })
        .in('id', ids)
      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        loadOwnerBookings()
      } else {
        setToast({ message: `${ids.length} cancellation(s) approved`, type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Error approving cancellations', type: 'error' })
      loadOwnerBookings()
    }
  }

  async function bulkDeclineCancellations(){
    const ids = bookings.filter(b => selectedBookings.has(b.id) && b.cancellation_status === 'requested').map(b => b.id)
    if (ids.length === 0) return
    const ok = typeof window !== 'undefined' ? window.confirm(`Decline cancellation for ${ids.length} booking(s)?`) : true
    if (!ok) return
    try {
      setBookings(prev => prev.map(b => ids.includes(b.id) ? { ...b, cancellation_status: 'declined' } : b))
      const { error } = await supabase
        .from('bookings')
        .update({ cancellation_status: 'declined' })
        .in('id', ids)
      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
        loadOwnerBookings()
      } else {
        setToast({ message: `${ids.length} cancellation(s) declined`, type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Error declining cancellations', type: 'error' })
      loadOwnerBookings()
    }
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const rejectedBookings = bookings.filter(b => b.status === 'rejected' || b.status === 'expired')

  const resortOptions = useMemo(() => {
    const map = new Map<string, string>()
    bookings.forEach(b => {
      if (b.resort_id) map.set(b.resort_id, b.resort?.name || 'Resort')
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [bookings])

  const bookedDatesForCalendar = useMemo(() => {
    const dates: Date[] = []
    const seen = new Set<string>()
    const today = new Date(); today.setHours(0,0,0,0)
    confirmedBookings
      .filter(b => selectedResortId === 'all' || b.resort_id === selectedResortId)
      .forEach(b => {
        const start = new Date(b.date_from)
        const end = new Date(b.date_to)
        eachDayOfInterval({ start, end }).forEach(d => {
          // Only mark upcoming/current days; exclude past
          if (d < today) return
          const key = d.toISOString().slice(0,10)
          if (!seen.has(key)) {
            seen.add(key)
            dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
          }
        })
      })
    return dates
  }, [confirmedBookings, selectedResortId])

  // Map each date (YYYY-MM-DD) to the bookings occurring on that day
  const dateToBookings = useMemo(() => {
    const map = new Map<string, any[]>()
    confirmedBookings
      .filter(b => selectedResortId === 'all' || b.resort_id === selectedResortId)
      .forEach(b => {
        const start = new Date(b.date_from)
        const end = new Date(b.date_to)
        eachDayOfInterval({ start, end }).forEach(d => {
          const key = d.toISOString().slice(0,10)
          const arr = map.get(key) || []
          arr.push(b)
          map.set(key, arr)
        })
      })
    return map
  }, [confirmedBookings, selectedResortId]);

  return (
    <OwnerBookingsContent
      loading={loading}
      toast={toast}
      resortOptions={resortOptions}
      selectedResortId={selectedResortId}
      setSelectedResortId={(id) => setSelectedResortId(id)}
      bookedDatesForCalendar={bookedDatesForCalendar}
      dateToBookings={dateToBookings}
      hoverTooltip={hoverTooltip}
      setHoverTooltip={setHoverTooltip}
      selectedDate={selectedDate}
      selectedDayBookings={selectedDayBookings}
      setSelectedDate={setSelectedDate}
      setSelectedDayBookings={setSelectedDayBookings}
      calendarRef={calendarRef}
      pendingBookings={pendingBookings}
      confirmedBookings={confirmedBookings}
      rejectedBookings={rejectedBookings}
      selectedBookings={selectedBookings}
      toggleSelect={toggleSelect}
      toggleSelectAll={toggleSelectAll}
      bulkDeleteBookings={bulkDeleteBookings}
      deleteBooking={deleteBooking}
      confirmBooking={confirmBooking}
      rejectBooking={rejectBooking}
      updateVerificationDetails={updateVerificationDetails}
      togglePaymentVerified={togglePaymentVerified}
      approveCancellation={approveCancellation}
      declineCancellation={declineCancellation}
      bulkApproveCancellations={bulkApproveCancellations}
      bulkDeclineCancellations={bulkDeclineCancellations}
      cancelBooking={cancelBooking}
      allResorts={ownerResorts}
      onAddManualBooking={addManualBooking}
      initialTab={initialTab}
    />
  )
}
