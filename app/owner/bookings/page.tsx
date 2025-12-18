'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import SkeletonTable from '../../../components/SkeletonTable'
import ChatLink from '../../../components/ChatLink'

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
            .select('id, email, full_name, role, is_admin')
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
          router.push('/auth/signin')
          return
        }

        // Check if user is owner
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin')
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
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">
          ← Back to Empire
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">📬</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Booking Requests</h1>
          </div>
          <p className="text-lg text-slate-600 ml-20">Manage all booking requests for your resorts</p>
        </div>

        {toast.message && (
          <div className={`mb-6 px-6 py-4 rounded-2xl font-semibold border-2 ${
            toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'
          }`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
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
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">⏳</span>
                <h2 className="text-3xl font-bold text-slate-900">Pending Requests ({pendingBookings.length})</h2>
              </div>

              {pendingBookings.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-lg font-bold text-slate-900 mb-2">No pending requests</p>
                  <p className="text-slate-600">Your pending booking queue is empty</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {pendingBookings.map(booking => (
                    <div key={booking.id} className="bg-white border-2 border-yellow-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{booking.resort?.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                          <p className="text-sm text-slate-600">📧 {booking.guest?.email}</p>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-bold border-2 border-yellow-300">⏳ Pending</span>
                      </div>

                      <div className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-100">
                        <p className="text-sm text-slate-700 mb-2">
                          📅 <span className="font-bold">{booking.date_from}</span> → <span className="font-bold">{booking.date_to}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          👥 <span className="font-bold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                        </p>
                        <p className="text-sm text-slate-600 mt-2 italic">
                          Requested: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-green-400"
                        >
                          ✅ Confirm
                        </button>
                        <button
                          onClick={() => rejectBooking(booking.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-red-400"
                        >
                          ❌ Reject
                        </button>
                        <ChatLink bookingId={booking.id} as="owner" label="Open Chat" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Confirmed Bookings */}
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">✅</span>
                <h2 className="text-3xl font-bold text-slate-900">Confirmed Bookings ({confirmedBookings.length})</h2>
              </div>

              {confirmedBookings.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-lg font-bold text-slate-900 mb-2">No confirmed bookings</p>
                  <p className="text-slate-600">Your confirmed bookings will appear here</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {confirmedBookings.map(booking => (
                    <div key={booking.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{booking.resort?.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                          <p className="text-sm text-slate-600">📧 {booking.guest?.email}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold border-2 border-green-300">✅ Confirmed</span>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-green-100">
                        <p className="text-sm text-slate-700 mb-2">
                          📅 <span className="font-bold">{booking.date_from}</span> → <span className="font-bold">{booking.date_to}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          👥 <span className="font-bold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                        </p>
                        <p className="text-sm text-slate-600 mt-2 italic">
                          ✓ Confirmed: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <ChatLink bookingId={booking.id} as="owner" label="Open Chat" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Rejected Bookings */}
            {rejectedBookings.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">❌</span>
                  <h2 className="text-3xl font-bold text-slate-900">Rejected Bookings ({rejectedBookings.length})</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {rejectedBookings.map(booking => (
                    <div key={booking.id} className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl p-6 shadow-sm opacity-80">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{booking.resort?.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                        </div>
                        <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-lg font-bold border-2 border-red-300">❌ Rejected</span>
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
