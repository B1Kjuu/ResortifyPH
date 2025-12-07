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
      
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      setIsAdmin(profile?.is_admin || false)

      // Get all bookings for this owner's resorts
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, resort:resorts(name, owner_id), guest:profiles(full_name)')
        .filter('resort.owner_id', 'eq', session.user.id)

      const pending = bookings?.filter(b => b.status === 'pending') || []
      const confirmed = bookings?.filter(b => b.status === 'confirmed') || []

      setPendingBookings(pending)
      setConfirmedBookings(confirmed)
      setLoading(false)
    }
    load()
  }, [router])

  async function confirmBooking(id: string){
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    const booking = pendingBookings.find(b => b.id === id)
    setPendingBookings(pendingBookings.filter(b => b.id !== id))
    if (booking) setConfirmedBookings([...confirmedBookings, booking])
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
                  <h4 className="font-semibold">{booking.resort?.name}</h4>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || 'Unknown'}</p>
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
                  <h4 className="font-semibold">{booking.resort?.name}</h4>
                  <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name || 'Unknown'}</p>
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
