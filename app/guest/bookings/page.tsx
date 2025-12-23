'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import ChatLink from '../../../components/ChatLink'
import { useRouter } from 'next/navigation'

export default function GuestBookingsPage(){
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      // Fetch bookings for this guest; include resort name via join, avoid profiles fetch
      const { data } = await supabase
        .from('bookings')
        .select('id, resort_id, guest_id, date_from, date_to, guest_count, status, created_at, resorts:resorts(id,name)')
        .eq('guest_id', session.user.id)
        .order('created_at', { ascending: false })
      setBookings(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null
    const sub = supabase
      .channel('guest_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) return
          const { data } = await supabase
            .from('bookings')
            .select('id, resort_id, guest_id, date_from, date_to, guest_count, status, created_at, resorts:resorts(id,name)')
            .eq('guest_id', session.user.id)
            .order('created_at', { ascending: false })
          setBookings(data || [])
        }, 250)
      })
      .subscribe()
    return () => { sub.unsubscribe(); if (refreshTimer) clearTimeout(refreshTimer) }
  }, [])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href="/guest/dashboard" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Dashboard</Link>
        <h1 className="text-3xl font-bold text-resort-900">My Bookings</h1>
        <p className="text-slate-600">View and manage all your resort bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No bookings yet</p>
          <Link href="/resorts" className="text-resort-500 font-semibold">Browse resorts →</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-resort-900">{booking.resorts?.name || `Resort ${booking.resort_id.slice(0,8)}`}</h3>
                  <p className="text-sm text-slate-600">{booking.date_from} → {booking.date_to}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <ChatLink bookingId={booking.id} as="guest" label="Message Host" title={booking.resorts?.name || undefined} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
