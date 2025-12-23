'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import ChatLink from '../../../components/ChatLink'

export default function BookingsControlPage(){
  type AdminBooking = {
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

  const [pendingBookings, setPendingBookings] = useState<AdminBooking[]>([])
  const [confirmedBookings, setConfirmedBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' })
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  async function loadAllBookings(){
    // Admin can see all bookings
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_bookings')
    if (rpcError) {
      console.error('Admin bookings RPC error:', rpcError)
    }
    const bookings: AdminBooking[] = (rpcData || []).map((row: any) => ({
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

    const pending = bookings.filter(b => b.status === 'pending')
    const confirmed = bookings.filter(b => b.status === 'confirmed')

    setPendingBookings(pending)
    setConfirmedBookings(confirmed)
  }

  useEffect(() => {
    async function checkAdminAndLoad(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      if (!profile?.is_admin) { router.push('/'); return }

      setIsAdmin(true)
      await loadAllBookings()
      setLoading(false)
    }
    checkAdminAndLoad()

    // Subscribe to real-time changes with debounce
    let refreshTimer: NodeJS.Timeout | null = null
    const subscription = supabase
      .channel('all_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => { loadAllBookings() }, 250)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
      // Revert optimistic update
      if (original) {
        setConfirmedBookings(prev => prev.filter(b => b.id !== id))
        setPendingBookings(prev => [original!, ...prev])
      }
      const msg = (error.message || '').toLowerCase()
      const friendly = msg.includes('exclusion') || msg.includes('overlap') || msg.includes('bookings_no_overlap')
        ? 'Cannot confirm: dates overlap with another confirmed booking.'
        : error.message
      setToast({ message: friendly, type: 'error' })
      const reverted = new Set(confirmingIds); reverted.delete(id); setConfirmingIds(reverted)
      return
    }
    setTimeout(() => loadAllBookings(), 500)
    setToast({ message: 'Booking confirmed!', type: 'success' })
    const cleared = new Set(confirmingIds); cleared.delete(id); setConfirmingIds(cleared)
  }

  async function rejectBooking(id: string){
    // Optimistic update
    setPendingBookings(prev => prev.filter(b => b.id !== id))
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { setToast({ message: error.message, type: 'error' }); return }
    setTimeout(() => loadAllBookings(), 500)
    setToast({ message: 'Booking rejected.', type: 'success' })
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading bookings...</div>
  if (!isAdmin) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 bg-gradient-to-br from-resort-50 to-resort-100 min-h-[80vh]">
      <Link href="/admin/command-center" className="text-sm text-resort-500 font-semibold mb-6 inline-block">← Back to Command Center</Link>
      
      {toast.message && (
        <div className={`mb-4 max-w-6xl mx-auto rounded-lg px-4 py-3 text-sm font-semibold ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-sm font-semibold text-resort-500">System Control</p>
          <h1 className="text-3xl font-bold text-resort-900">Booking Control Center</h1>
          <p className="text-slate-600 text-sm mt-1">Manage all guest bookings across the platform</p>
        </div>

        {/* Pending Bookings */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-resort-900">Awaiting Confirmation</h3>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold">{pendingBookings.length}</span>
          </div>
          {pendingBookings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-600">
              <p className="font-semibold text-resort-900">All pending bookings confirmed ✓</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-resort-900">{booking.resort?.name}</h4>
                      <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">📅 {booking.date_from} → {booking.date_to}</p>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => confirmBooking(booking.id)} disabled={confirmingIds.has(booking.id)} className={`flex-1 px-3 py-2 text-sm rounded-lg transition font-semibold ${confirmingIds.has(booking.id) ? 'bg-green-300 text-white cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>Confirm</button>
                    <button onClick={() => rejectBooking(booking.id)} className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold">Reject</button>
                    <ChatLink bookingId={booking.id} as="admin" label="Open Chat" title={booking.resort?.name || undefined} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Confirmed Bookings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-resort-900">Confirmed Bookings</h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">{confirmedBookings.length}</span>
          </div>
          {confirmedBookings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-600">
              <p className="font-semibold text-resort-900">No confirmed bookings yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {confirmedBookings.map(booking => (
                <div key={booking.id} className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-resort-900">{booking.resort?.name}</h4>
                      <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                    </div>
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Confirmed</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">📅 {booking.date_from} → {booking.date_to}</p>
                  <ChatLink bookingId={booking.id} as="admin" label="Open Chat" title={booking.resort?.name || undefined} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
