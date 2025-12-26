'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import OwnerBookingsContent from '../../../components/OwnerBookingsContent'
import { eachDayOfInterval } from 'date-fns'

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
  const calendarRef = React.useRef<HTMLDivElement | null>(null)
  const router = useRouter()
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
        guest: { id: row.guest_id, full_name: row.guest_full_name, email: row.guest_email }
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

  // Load bookings when userId is set
  useEffect(() => {
    if (!userId) return

    loadOwnerBookings()

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
  const rejectedBookings = bookings.filter(b => b.status === 'rejected')

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
    />
  )
}
