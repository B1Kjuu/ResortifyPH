'use client'
import React, { useEffect, useState } from 'react'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { format, addMonths } from 'date-fns'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import OwnerAvailabilityCalendar from '../../../components/OwnerAvailabilityCalendar'

export default function BookingsManagementPage(){
  type OwnerBooking = {
    id: string
    resort_id: string
    date_from: string
    date_to: string
    guest_count: number
    status: string
    created_at: string
    resort: { name: string | null }
    guest: { full_name: string | null; email: string | null }
  }

  const [pendingBookings, setPendingBookings] = useState<OwnerBooking[]>([])
  const [confirmedBookings, setConfirmedBookings] = useState<OwnerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [month, setMonth] = useState<Date>(new Date())
  const [selectedResortId, setSelectedResortId] = useState<string | 'all'>('all')
  const [hoverRange, setHoverRange] = useState<{ from?: string; to?: string } | null>(null)
  const [pinnedRange, setPinnedRange] = useState<{ from?: string; to?: string } | null>(null)

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      setIsAdmin(profile?.is_admin || false)

      // Get all bookings for this owner's resorts
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_owner_bookings')
      if (rpcError) {
        console.error('Owner bookings RPC error:', rpcError)
      }
      const bookings: OwnerBooking[] = (rpcData || []).map((row: any) => ({
        id: row.booking_id,
        resort_id: row.resort_id,
        date_from: row.date_from,
        date_to: row.date_to,
        guest_count: row.guest_count,
        status: row.status,
        created_at: row.created_at,
        resort: { name: row.resort_name },
        guest: { full_name: row.guest_full_name, email: row.guest_email }
      }))

      const pending = bookings.filter((b: OwnerBooking) => b.status === 'pending')
      const confirmed = bookings.filter((b: OwnerBooking) => b.status === 'confirmed')

      setPendingBookings(pending)
      setConfirmedBookings(confirmed)
      setLoading(false)
    }
    load()
    
    // Debounced realtime subscription
    let refreshTimer: NodeJS.Timeout | null = null
    const sub = supabase
      .channel('owner_dashboard_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(() => load(), 250)
      })
      .subscribe()
    return () => { sub.unsubscribe(); if (refreshTimer) clearTimeout(refreshTimer) }
  }, [router])

  async function confirmBooking(id: string){
    if (confirmingIds.has(id)) return
    const next = new Set(confirmingIds); next.add(id); setConfirmingIds(next)
    // Optimistic update
    const original = pendingBookings.find(b => b.id === id)
    setPendingBookings(prev => prev.filter(b => b.id !== id))
    if (original) setConfirmedBookings(prev => [...prev, { ...original, status: 'confirmed' }])
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) {
      // Revert
      if (original) {
        setConfirmedBookings(prev => prev.filter(b => b.id !== id))
        setPendingBookings(prev => [original!, ...prev])
      }
      const msg = (error.message || '').toLowerCase()
      const friendly = msg.includes('exclusion') || msg.includes('overlap') || msg.includes('bookings_no_overlap')
        ? 'Cannot confirm: dates overlap with another confirmed booking.'
        : error.message
      alert(friendly)
      const reverted = new Set(confirmingIds); reverted.delete(id); setConfirmingIds(reverted)
      return
    }
    // Fallback refresh in case realtime is delayed
    setTimeout(() => {
      supabase
        .from('bookings')
        .select('id')
        .limit(1)
        .then(() => {})
    }, 500)
    alert('Booking confirmed!')
    const cleared = new Set(confirmingIds); cleared.delete(id); setConfirmingIds(cleared)
  }

  async function rejectBooking(id: string){
    // Optimistic update
    setPendingBookings(prev => prev.filter(b => b.id !== id))
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    // Fallback ping
    setTimeout(() => {
      supabase
        .from('bookings')
        .select('id')
        .limit(1)
        .then(() => {})
    }, 500)
    alert('Booking rejected.')
  }

  if (loading) return <div>Loading...</div>

  // Build day stats for calendar from both pending and confirmed bookings (with resort filter)
  const filteredPending = selectedResortId === 'all' ? pendingBookings : pendingBookings.filter(b => b.resort_id === selectedResortId)
  const filteredConfirmed = selectedResortId === 'all' ? confirmedBookings : confirmedBookings.filter(b => b.resort_id === selectedResortId)
  const dayStats: Record<string, { pending: number; confirmed: number }> = {}
  function addRangeToStats(from: string, to: string, status: string){
    const start = new Date(from)
    const end = new Date(to)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd')
      if (!dayStats[key]) dayStats[key] = { pending: 0, confirmed: 0 }
      if (status === 'pending') dayStats[key].pending += 1
      if (status === 'confirmed') dayStats[key].confirmed += 1
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  filteredPending.forEach(b => addRangeToStats(b.date_from, b.date_to, 'pending'))
  filteredConfirmed.forEach(b => addRangeToStats(b.date_from, b.date_to, 'confirmed'))

  function bookingCoversDate(b: OwnerBooking, dateStr: string){
    const d = new Date(dateStr)
    const from = new Date(b.date_from)
    const to = new Date(b.date_to)
    return d >= from && d <= to
  }
  const visiblePending = selectedDate ? filteredPending.filter(b => bookingCoversDate(b, selectedDate)) : filteredPending
  const visibleConfirmed = selectedDate ? filteredConfirmed.filter(b => bookingCoversDate(b, selectedDate)) : filteredConfirmed

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold mb-6">Bookings Management</h2>
        <div className="mb-6">
          <DisclaimerBanner title="Owner Payment Notice">
            ResortifyPH does not process payments. Share payment details with guests in chat and verify transfers before confirming.
          </DisclaimerBanner>
        </div>

        {/* Availability Calendar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonth(prev => addMonths(prev, -1))} className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">◀ Prev</button>
              <button onClick={() => setMonth(prev => addMonths(prev, 1))} className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">Next ▶</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{format(month, 'MMMM yyyy')}</span>
              <label className="text-sm text-slate-600">Resort:</label>
              <select value={selectedResortId} onChange={(e) => setSelectedResortId(e.target.value as any)} className="text-sm px-3 py-1.5 border border-slate-300 rounded">
                <option value="all">All</option>
                {Array.from(new Map([...pendingBookings, ...confirmedBookings].map(b => [b.resort_id, b.resort?.name || 'Unnamed Resort']))).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
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
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-slate-600">Filtering bookings for <span className="font-semibold text-resort-900">{selectedDate}</span></p>
              <button onClick={() => { setSelectedDate(null); setPinnedRange(null); setHoverRange(null); }} className="text-sm px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">Clear filter</button>
            </div>
          )}
        </div>

        {/* Pending Bookings */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-3">Pending Bookings ({visiblePending.length})</h3>
          {visiblePending.length === 0 ? (
            <p className="text-slate-500">No pending bookings.</p>
          ) : (
            <div className="space-y-3">
              {visiblePending.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg"
                  onMouseEnter={() => setHoverRange({ from: booking.date_from, to: booking.date_to })}
                  onMouseLeave={() => setHoverRange(null)}
                  onClick={() => setPinnedRange({ from: booking.date_from, to: booking.date_to })}
                >
                  <h4 className="font-semibold">{booking.resort?.name || 'Resort'}</h4>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => confirmBooking(booking.id)} disabled={confirmingIds.has(booking.id)} className={`px-3 py-1 text-sm rounded ${confirmingIds.has(booking.id) ? 'bg-green-300 text-white cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>Confirm</button>
                    <button onClick={() => rejectBooking(booking.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Confirmed Bookings */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Confirmed Bookings ({visibleConfirmed.length})</h3>
          {visibleConfirmed.length === 0 ? (
            <p className="text-slate-500">No confirmed bookings.</p>
          ) : (
            <div className="space-y-3">
              {visibleConfirmed.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg bg-green-50"
                  onMouseEnter={() => setHoverRange({ from: booking.date_from, to: booking.date_to })}
                  onMouseLeave={() => setHoverRange(null)}
                  onClick={() => setPinnedRange({ from: booking.date_from, to: booking.date_to })}
                >
                  <h4 className="font-semibold">{booking.resort?.name || 'Resort'}</h4>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <span className="inline-block text-xs bg-green-500 text-white px-2 py-1 rounded mt-2">Confirmed</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
