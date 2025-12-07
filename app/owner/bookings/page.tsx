'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import SkeletonTable from '../../../components/SkeletonTable'

export default function OwnerBookingsPage(){
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' })
  const router = useRouter()

  async function loadOwnerBookings(){
    if (!userId) return

    try {
      // Get all resorts owned by this user
      const { data: resorts, error: resortsError } = await supabase
        .from('resorts')
        .select('id')
        .eq('owner_id', userId)

      if (resortsError) {
        console.error('Resorts error:', resortsError)
        return
      }

      if (!resorts || resorts.length === 0) {
        setBookings([])
        return
      }

      const resortIds = resorts.map(r => r.id)

      // Get all bookings for these resorts - using filter instead of in
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, resort_id, guest_id, date_from, date_to, guest_count, status, created_at')
        .in('resort_id', resortIds)
        .order('created_at', { ascending: false })

      if (bookingsError) {
        console.error('Bookings error details:', bookingsError)
        setBookings([])
        return
      }

      // Fetch resort and guest data separately to avoid join issues
      let enrichedBookings: any[] = []
      
      if (bookingsData && bookingsData.length > 0) {
        for (const booking of bookingsData) {
          const { data: resort } = await supabase
            .from('resorts')
            .select('name, id')
            .eq('id', booking.resort_id)
            .single()

          const { data: guest } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.guest_id)
            .single()

          enrichedBookings.push({
            ...booking,
            resort,
            guest
          })
        }
      }

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
          router.push('/auth/login')
          return
        }

        // Check if user is owner
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        if (profile?.role !== 'owner') {
          router.push('/owner/empire')
          return
        }

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

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('owner_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadOwnerBookings()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  async function confirmBooking(bookingId: string){
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
      } else {
        setToast({ message: 'Booking confirmed!', type: 'success' })
        loadOwnerBookings()
      }
    } catch (err) {
      setToast({ message: 'Error confirming booking', type: 'error' })
    }
  }

  async function rejectBooking(bookingId: string){
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', bookingId)

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' })
      } else {
        setToast({ message: 'Booking rejected', type: 'success' })
        loadOwnerBookings()
      }
    } catch (err) {
      setToast({ message: 'Error rejecting booking', type: 'error' })
    }
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const rejectedBookings = bookings.filter(b => b.status === 'rejected')

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-resort-50 to-white px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-6 inline-block hover:text-resort-600 transition">
          ← Back to Empire
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-resort-900 mb-2">Booking Requests</h1>
          <p className="text-slate-600">Manage all booking requests for your resorts</p>
        </div>

        {toast.message && (
          <div className={`mb-6 px-6 py-4 rounded-lg font-semibold ${
            toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <SkeletonTable rows={3} />
          </div>
        ) : (
          <>
            {/* Pending Bookings */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-resort-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">⏳</span>
                Pending Requests ({pendingBookings.length})
              </h2>

              {pendingBookings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600">No pending booking requests</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="bg-white border border-yellow-200 rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-resort-900">{booking.resort?.name}</h3>
                      <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name}</p>
                      <p className="text-sm text-slate-600">📧 {booking.guest?.email}</p>
                    </div>
                    <span className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full font-semibold">Pending</span>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-700 mb-2">
                      📅 <span className="font-semibold">{booking.date_from}</span> → <span className="font-semibold">{booking.date_to}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      👥 <span className="font-semibold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                    </p>
                    <p className="text-sm text-slate-700 mt-2">
                      📆 Requested: {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => confirmBooking(booking.id)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
                    >
                      ✓ Confirm
                    </button>
                    <button
                      onClick={() => rejectBooking(booking.id)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Confirmed Bookings */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-resort-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">✓</span>
            Confirmed Bookings ({confirmedBookings.length})
          </h2>

          {confirmedBookings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600">No confirmed bookings yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {confirmedBookings.map(booking => (
                <div key={booking.id} className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-resort-900">{booking.resort?.name}</h3>
                      <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name}</p>
                      <p className="text-sm text-slate-600">📧 {booking.guest?.email}</p>
                    </div>
                    <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">Confirmed</span>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-slate-700 mb-2">
                      📅 <span className="font-semibold">{booking.date_from}</span> → <span className="font-semibold">{booking.date_to}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      👥 <span className="font-semibold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                    </p>
                    <p className="text-sm text-slate-700 mt-2">
                      ✓ Confirmed: {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rejected Bookings */}
        {rejectedBookings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-resort-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">✗</span>
              Rejected Bookings ({rejectedBookings.length})
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {rejectedBookings.map(booking => (
                <div key={booking.id} className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-lg opacity-75">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-resort-900">{booking.resort?.name}</h3>
                      <p className="text-sm text-slate-600">Guest: {booking.guest?.full_name}</p>
                    </div>
                    <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-semibold">Rejected</span>
                  </div>

                  <p className="text-sm text-slate-700">
                    📅 {booking.date_from} → {booking.date_to}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        </>
        )}
      </div>
    </div>
  )
}
