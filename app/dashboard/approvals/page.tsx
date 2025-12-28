'use client'
import React, { useEffect, useState } from 'react'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import Select from '../../../components/Select'
import { format, addMonths } from 'date-fns'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'
import ChatLink from '../../../components/ChatLink'
import OwnerAvailabilityCalendar from '../../../components/OwnerAvailabilityCalendar'
import { toast } from 'sonner'

type OwnerBooking = {
  id: string
  resort_id: string
  guest_id: string
  date_from: string
  date_to: string
  guest_count: number
  status: string
  cancellation_status?: string | null
  cancellation_requested_at?: string | null
  cancellation_reason?: string | null
  created_at: string
  resort: { id: string; name: string | null }
  guest: { id: string; full_name: string | null; email: string | null }
}

export default function ApprovalsPage(){
  const [pendingResorts, setPendingResorts] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<OwnerBooking[]>([])
  const [confirmedBookings, setConfirmedBookings] = useState<OwnerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())
  const [month, setMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedResortId, setSelectedResortId] = useState<string | 'all'>('all')
  const [hoverRange, setHoverRange] = useState<{ from?: string; to?: string } | null>(null)
  const [pinnedRange, setPinnedRange] = useState<{ from?: string; to?: string } | null>(null)

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      // Get pending resorts owned by this user
      const { data: resorts } = await supabase
        .from('resorts')
        .select('*')
        .eq('owner_id', session.user.id)
        .eq('status', 'pending')

      // Get bookings via secure RPC to include guest details and avoid RLS recursion
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_owner_bookings')
      if (rpcError) {
        console.error('Owner bookings RPC error:', rpcError)
      }
      const allOwnerBookings: OwnerBooking[] = (rpcData || []).map((row: any) => ({
        id: row.booking_id,
        resort_id: row.resort_id,
        guest_id: row.guest_id,
        date_from: row.date_from,
        date_to: row.date_to,
        guest_count: row.guest_count,
        status: row.status,
        cancellation_status: row.cancellation_status,
        cancellation_requested_at: row.cancellation_requested_at,
        cancellation_reason: row.cancellation_reason,
        created_at: row.created_at,
        resort: { id: row.resort_id, name: row.resort_name },
        guest: { id: row.guest_id, full_name: row.guest_full_name, email: row.guest_email }
      }))

      // Only show pending bookings here
      const pending = allOwnerBookings.filter((b: OwnerBooking) => b.status === 'pending')
      const confirmed = allOwnerBookings.filter((b: OwnerBooking) => b.status === 'confirmed')

      setPendingResorts(resorts || [])
      setPendingBookings(pending)
      setConfirmedBookings(confirmed)
      setLoading(false)
    }
    load()

    // Subscribe to realtime booking changes with debounce
    let refreshTimer: NodeJS.Timeout | null = null
    const subscription = supabase
      .channel('owner_approvals_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => { load() }, 250)
        }
      )
      .subscribe()

    // Subscribe to resort changes to refresh pending resorts
    const resortSubscription = supabase
      .channel('owner_approvals_resorts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resorts' },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => { load() }, 250)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      resortSubscription.unsubscribe()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [])

  async function approveResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) { toast.error(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    toast.success('Resort approved!')
  }

  async function rejectResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { toast.error(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    toast.success('Resort rejected.')
  }

  async function confirmBooking(id: string){
    if (confirmingIds.has(id)) return
    const next = new Set(confirmingIds); next.add(id); setConfirmingIds(next)
    const original = pendingBookings.find(b => b.id === id)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      const friendly = msg.includes('exclusion') || msg.includes('overlap') || msg.includes('bookings_no_overlap')
        ? 'Cannot confirm: dates overlap with another confirmed booking.'
        : error.message
      toast.error(friendly)
      const reverted = new Set(confirmingIds); reverted.delete(id); setConfirmingIds(reverted)
      return
    }
    setPendingBookings(pendingBookings.filter(b => b.id !== id))
    toast.success('Booking confirmed!')
    const cleared = new Set(confirmingIds); cleared.delete(id); setConfirmingIds(cleared)
  }

  async function rejectBooking(id: string){
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { toast.error(error.message); return }
    setPendingBookings(pendingBookings.filter(b => b.id !== id))
    toast.success('Booking rejected.')
  }

  if (loading) return <div>Loading...</div>

  // Build day stats (pending only) and apply filters
  const filteredPendingByResort = selectedResortId === 'all'
    ? pendingBookings
    : pendingBookings.filter(b => b.resort?.id === selectedResortId)
  const filteredConfirmedByResort = selectedResortId === 'all'
    ? confirmedBookings
    : confirmedBookings.filter(b => b.resort?.id === selectedResortId)

  const dayStats: Record<string, { pending: number; confirmed: number }> = {}
  function addRange(from: string, to: string){
    const start = new Date(from)
    const end = new Date(to)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd')
      if (!dayStats[key]) dayStats[key] = { pending: 0, confirmed: 0 }
      dayStats[key].pending += 1
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  filteredPendingByResort.forEach(b => addRange(b.date_from, b.date_to))
  // add confirmed counts
  filteredConfirmedByResort.forEach(b => {
    const start = new Date(b.date_from)
    const end = new Date(b.date_to)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd')
      if (!dayStats[key]) dayStats[key] = { pending: 0, confirmed: 0 }
      dayStats[key].confirmed += 1
      cursor.setDate(cursor.getDate() + 1)
    }
  })

  function coversDate(b: OwnerBooking, dateStr: string){
    const d = new Date(dateStr)
    const from = new Date(b.date_from)
    const to = new Date(b.date_to)
    return d >= from && d <= to
  }
  const visiblePendingBookings = selectedDate
    ? filteredPendingByResort.filter(b => coversDate(b, selectedDate))
    : filteredPendingByResort

  const cancellationRequests = confirmedBookings.filter(b => b.cancellation_status === 'requested')

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold mb-6">Approvals & Management</h2>
        <div className="mb-6">
          <DisclaimerBanner title="Owner Payment Notice">
            ResortifyPH does not process payments. Share payment details with guests in chat and verify transfers before confirming.
          </DisclaimerBanner>
        </div>

        {/* Availability Calendar + Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonth(prev => addMonths(prev, -1))} className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">◀ Prev</button>
              <button onClick={() => setMonth(prev => addMonths(prev, 1))} className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">Next ▶</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Resort:</label>
              <Select ariaLabel="Resort filter" value={selectedResortId} onChange={(e) => setSelectedResortId(e.target.value as any)} className="text-sm min-w-[140px]">
                <option value="all">All</option>
                {Array.from(new Map(pendingBookings.map(b => [b.resort.id, b.resort.name || 'Unnamed Resort']))).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </Select>
            </div>
          </div>
          <OwnerAvailabilityCalendar
            month={month}
            dayStats={dayStats}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
            weekStartsOn={1}
            highlightRange={(pinnedRange || hoverRange) || undefined}
          />
          {selectedDate && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Filtering pending bookings for <span className="font-semibold text-resort-900">{selectedDate}</span></p>
              <button onClick={() => { setSelectedDate(null); setPinnedRange(null); setHoverRange(null); }} className="text-sm px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">Clear filter</button>
            </div>
          )}
        </div>

        {/* Pending Resorts */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-3">Pending Resorts ({pendingResorts.length})</h3>
          {pendingResorts.length === 0 ? (
            <p className="text-slate-500">No pending resorts.</p>
          ) : (
            <div className="space-y-3">
              {pendingResorts.map(resort => (
                <div key={resort.id} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{resort.name}</h4>
                  <p className="text-sm text-slate-600">{resort.location} — ₱{resort.price}</p>
                  <p className="text-sm mt-2">{resort.description}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => approveResort(resort.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded">Approve</button>
                    <button onClick={() => rejectResort(resort.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Bookings */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Pending Bookings ({visiblePendingBookings.length})</h3>
          {visiblePendingBookings.length === 0 ? (
            <p className="text-slate-500">No pending bookings.</p>
          ) : (
            <div className="space-y-3">
              {visiblePendingBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg"
                  onMouseEnter={() => setHoverRange({ from: booking.date_from, to: booking.date_to })}
                  onMouseLeave={() => setHoverRange(null)}
                  onClick={() => setPinnedRange({ from: booking.date_from, to: booking.date_to })}
                >
                  <h4 className="font-semibold">{booking.resort?.name || 'Unknown Resort'}</h4>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={() => confirmBooking(booking.id)} disabled={confirmingIds.has(booking.id)} className={`px-3 py-1 text-sm rounded ${confirmingIds.has(booking.id) ? 'bg-green-300 text-white cursor-not-allowed' : 'bg-green-500 text-white'}`}>Confirm</button>
                    <button onClick={() => rejectBooking(booking.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">Reject</button>
                    <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cancellation Requests */}
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Cancellation Requests ({cancellationRequests.length})</h3>
          {cancellationRequests.length === 0 ? (
            <p className="text-slate-500">No cancellation requests.</p>
          ) : (
            <div className="space-y-3">
              {cancellationRequests.map(booking => (
                <div key={booking.id} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{booking.resort?.name || 'Unknown Resort'}</h4>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  {booking.cancellation_reason && (
                    <p className="text-sm text-slate-600">Reason: {booking.cancellation_reason}</p>
                  )}
                  <div className="flex gap-2 mt-4 items-center">
                    <button
                      onClick={async () => {
                        const { error } = await supabase.rpc('respond_booking_cancellation', { p_booking_id: booking.id, p_approve: true })
                        if (error) { toast.error(error.message); return }
                        toast.success('Cancellation approved')
                        // Refresh lists
                        const nextConfirmed = confirmedBookings.filter(b => b.id !== booking.id)
                        setConfirmedBookings(nextConfirmed)
                      }}
                      className="px-3 py-1 text-sm rounded bg-green-500 text-white"
                    >Approve</button>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.rpc('respond_booking_cancellation', { p_booking_id: booking.id, p_approve: false })
                        if (error) { toast.error(error.message); return }
                        toast.success('Cancellation rejected')
                        // Update in place
                        setConfirmedBookings(prev => prev.map(b => b.id === booking.id ? { ...b, cancellation_status: 'rejected' } : b))
                      }}
                      className="px-3 py-1 text-sm rounded bg-red-500 text-white"
                    >Reject</button>
                    <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
