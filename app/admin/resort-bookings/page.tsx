"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import Select from '../../../components/Select'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import ChatLink from '../../../components/ChatLink'
import { useRouter } from 'next/navigation'

type Resort = { id: string; name: string }
type AdminBooking = {
  booking_id: string
  resort_id: string
  date_from: string
  date_to: string
  guest_count: number
  status: string
  cancellation_status?: string | null
  cancellation_requested_at?: string | null
  cancellation_reason?: string | null
  created_at: string
  guest_full_name?: string | null
  guest_email?: string | null
}

export default function ResortBookingsPage(){
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resorts, setResorts] = useState<Resort[]>([])
  const [selectedResortId, setSelectedResortId] = useState<string>('')
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [fetchingBookings, setFetchingBookings] = useState(false)

  useEffect(() => {
    let mounted = true
    async function init(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_admin, email')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile?.is_admin) { router.push('/'); return }
      if (!profile?.email) { router.push('/profile?requireEmail=1'); return }
      if (mounted) setIsAdmin(true)

      const { data: resortsData, error } = await supabase
        .from('resorts')
        .select('id, name')
        .order('name', { ascending: true })
      if (!error && resortsData && mounted) setResorts(resortsData as Resort[])
      setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [])

  async function loadBookings(resortId: string){
    if (!resortId) return
    setFetchingBookings(true)
    const { data, error } = await supabase.rpc('get_resort_bookings_admin', { p_resort_id: resortId })
    if (error) {
      console.error('Admin resort bookings RPC error:', error)
      setBookings([])
    } else {
      setBookings((data || []) as AdminBooking[])
    }
    setFetchingBookings(false)
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading…</div>
  if (!isAdmin) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
        <Link href="/admin/command-center" className="text-sm text-blue-600 font-semibold mb-6 inline-block">← Back to Command Center</Link>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">📘</span>
            <h1 className="text-3xl font-bold text-slate-900">Resort Bookings (View-Only)</h1>
          </div>
          <div className="max-w-3xl">
            <DisclaimerBanner title="Moderation Focus">
              View bookings by resort to assist moderation. Admins don’t confirm/reject; owners manage bookings.
            </DisclaimerBanner>
          </div>
        </div>

        {/* Resort selector */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Choose a Resort</label>
          <Select
            ariaLabel="Choose a resort"
            className="w-full max-w-md"
            value={selectedResortId}
            onChange={(e) => { const id = e.target.value; setSelectedResortId(id); loadBookings(id) }}
          >
            <option value="">Select a resort…</option>
            {resorts.map((r) => (
              <option key={r.id} value={r.id}>{r.name || r.id.slice(0,8)}</option>
            ))}
          </Select>
        </div>

        {/* Bookings list */}
        {selectedResortId && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Bookings</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">{bookings.length}</span>
            </div>
            {fetchingBookings ? (
              <div className="text-slate-600">Loading bookings…</div>
            ) : bookings.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-600">
                <p className="font-semibold text-slate-900">No bookings for this resort yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {bookings.map((b) => (
                  <div key={b.booking_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">Booking</p>
                        <p className="text-xs text-slate-500">ID: {b.booking_id.slice(0,8)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${b.status === 'confirmed' ? 'bg-green-100 text-green-800' : b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}`}>{b.status}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">📅 {b.date_from} → {b.date_to}</p>
                    <p className="text-sm text-slate-600">Guest: {b.guest_full_name || b.guest_email || 'Guest'}</p>
                    {b.cancellation_status === 'requested' && (
                      <p className="text-xs mt-2 text-yellow-800 bg-yellow-50 inline-block px-2 py-1 rounded">Cancellation requested</p>
                    )}
                    {b.cancellation_reason && (
                      <p className="text-xs text-slate-600 mt-1">Reason: {b.cancellation_reason}</p>
                    )}
                    {/* Admin resort bookings are view-only; no chat entry here */}
                    <div className="mt-3">
                      <span className="text-xs text-slate-500">Chat access disabled in admin view</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
