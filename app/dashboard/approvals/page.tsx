'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'
import ChatLink from '../../../components/ChatLink'

export default function ApprovalsPage(){
  const [pendingResorts, setPendingResorts] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      const allOwnerBookings = (rpcData || []).map((row: any) => ({
        id: row.booking_id,
        resort_id: row.resort_id,
        guest_id: row.guest_id,
        date_from: row.date_from,
        date_to: row.date_to,
        guest_count: row.guest_count,
        status: row.status,
        created_at: row.created_at,
        resort: { id: row.resort_id, name: row.resort_name },
        guest: { id: row.guest_id, full_name: row.guest_full_name, email: row.guest_email }
      }))

      // Only show pending bookings here
      const pending = allOwnerBookings.filter(b => b.status === 'pending')

      setPendingResorts(resorts || [])
      setPendingBookings(pending)
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
    if (error) { alert(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    alert('Resort approved!')
  }

  async function rejectResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    alert('Resort rejected.')
  }

  async function confirmBooking(id: string){
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setPendingBookings(pendingBookings.filter(b => b.id !== id))
    alert('Booking confirmed!')
  }

  async function rejectBooking(id: string){
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setPendingBookings(pendingBookings.filter(b => b.id !== id))
    alert('Booking rejected.')
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold mb-6">Approvals & Management</h2>

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
          <h3 className="text-xl font-semibold mb-3">Pending Bookings ({pendingBookings.length})</h3>
          {pendingBookings.length === 0 ? (
            <p className="text-slate-500">No pending bookings.</p>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{booking.resort?.name || 'Unknown Resort'}</h4>
                  <p className="text-sm text-slate-600">{booking.date_from} to {booking.date_to}</p>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || booking.guest?.email || 'Guest'}</p>
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={() => confirmBooking(booking.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded">Confirm</button>
                    <button onClick={() => rejectBooking(booking.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">Reject</button>
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
