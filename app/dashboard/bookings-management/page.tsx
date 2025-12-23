'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function BookingsManagementPage(){
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [confirmedBookings, setConfirmedBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

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
      const bookings = (rpcData || []).map((row: any) => ({
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

      const pending = bookings?.filter(b => b.status === 'pending') || []
      const confirmed = bookings?.filter(b => b.status === 'confirmed') || []

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
    // Optimistic update
    setPendingBookings(prev => prev.filter(b => b.id !== id))
    const booking = pendingBookings.find(b => b.id === id)
    if (booking) setConfirmedBookings(prev => [...prev, { ...booking, status: 'confirmed' }])
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    // Fallback refresh in case realtime is delayed
    setTimeout(() => {
      supabase
        .from('bookings')
        .select('id')
        .limit(1)
        .then(() => {})
    }, 500)
    alert('Booking confirmed!')
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

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold mb-6">Bookings Management</h2>

        {/* Pending Bookings */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-3">Pending Bookings ({pendingBookings.length})</h3>
          {pendingBookings.length === 0 ? (
            <p className="text-slate-500">No pending bookings.</p>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{booking.resort?.name || 'Resort'}</h4>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => confirmBooking(booking.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">Confirm</button>
                    <button onClick={() => rejectBooking(booking.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Confirmed Bookings */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Confirmed Bookings ({confirmedBookings.length})</h3>
          {confirmedBookings.length === 0 ? (
            <p className="text-slate-500">No confirmed bookings.</p>
          ) : (
            <div className="space-y-3">
              {confirmedBookings.map(booking => (
                <div key={booking.id} className="p-4 border rounded-lg bg-green-50">
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
