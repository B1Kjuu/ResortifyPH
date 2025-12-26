'use client'
import React, { useEffect, useMemo, useState } from 'react'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import SkeletonTable from '../../../components/SkeletonTable'
import DateRangePicker from '../../../components/DateRangePicker'
import { eachDayOfInterval } from 'date-fns'

export default function TripsPage(){
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [tab, setTab] = useState<'upcoming' | 'current' | 'history'>('upcoming')

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin')
          .eq('id', session.user.id)
          .single()
        
        if (!mounted) return

        if (profileError) {
          console.error('Profile error:', profileError)
          setLoading(false)
          return
        }

        if (!profile || profile?.role !== 'guest') {
          router.push('/')
          return
        }

        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, resort_id, guest_id, date_from, date_to, guest_count, status, created_at, cancellation_status, cancellation_requested_at, cancellation_reason, resorts:resorts(id,name,location)')
          .eq('guest_id', session.user.id)
          .order('created_at', { ascending: false })

        if (!mounted) return

        if (bookingsError) {
          console.error('Bookings error:', bookingsError)
        }

        setBookings(bookingsData || [])
        setLoading(false)
      } catch (err) {
        console.error('Trips error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    return () => { mounted = false }
  }, [])

  // Polished calendar: map confirmed bookings to per-day ISO strings
  const confirmedBookings = useMemo(() => bookings.filter(b => b.status === 'confirmed'), [bookings])
  const bookedDates = useMemo(() => {
    const dates: string[] = []
    const seen = new Set<string>()
    confirmedBookings.forEach(b => {
      const start = new Date(b.date_from)
      const end = new Date(b.date_to)
      eachDayOfInterval({ start, end }).forEach(d => {
        const key = d.toISOString().slice(0,10)
        if (!seen.has(key)) {
          seen.add(key)
          dates.push(key)
        }
      })
    })
    return dates
  }, [confirmedBookings])

  const [selectedRange, setSelectedRange] = useState({ from: undefined as Date | undefined, to: undefined as Date | undefined });

  ;
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 fade-in-up">
          <Link href="/guest/adventure-hub" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Hub</Link>
          <h1 className="text-3xl font-bold text-resort-900">Your Trips</h1>
          <p className="text-slate-600">View and manage all your resort bookings</p>
          <div className="mt-4">
            <DisclaimerBanner title="Payment Notice">
              ResortifyPH does not process payments. Coordinate payment directly with the host inside chat and verify details before sending money.
            </DisclaimerBanner>
          </div>
        </div>

        <section className="mb-10 fade-in-up">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Bookings Calendar</h2>
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
            <DateRangePicker
              bookedDates={bookedDates}
              selectedRange={selectedRange}
              onSelectRange={setSelectedRange}
              preferTwoMonthsOnDesktop
            />
            <p className="text-sm text-slate-600 mt-2">Red-marked dates are your confirmed bookings.</p>
          </div>
        </section>

        {loading ? (
          <SkeletonTable rows={3} />
        ) : bookings.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center fade-in-up">
            <p className="text-slate-600 mb-4">No trips yet</p>
            <Link href="/resorts" className="text-resort-500 font-semibold">Start exploring →</Link>
          </div>
        ) : (
          (() => {
            const now = new Date()
            const upcoming = bookings.filter(b => new Date(b.date_to) >= now)
            const current = bookings.filter(b => b.status === 'confirmed' && new Date(b.date_to) >= now)
            const pastOrRejected = bookings.filter(b => new Date(b.date_to) < now || b.status === 'rejected')
            async function deleteBooking(id: string){
              const ok = typeof window !== 'undefined' ? window.confirm('Delete this booking? This cannot be undone.') : true
              if (!ok) return
              try {
                const { error } = await supabase
                  .from('bookings')
                  .delete()
                  .eq('id', id)
                if (error) {
                  alert(`Failed to delete: ${error.message}`)
                } else {
                  const next = bookings.filter(b => b.id !== id)
                  setBookings(next)
                }
              } catch (err: any) {
                alert(err?.message || 'Failed to delete booking')
              }
            }
            return (
              <>
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-4">
                  {([
                    { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
                    { key: 'current', label: `Current (${current.length})` },
                    { key: 'history', label: `History (${pastOrRejected.length})` },
                  ] as const).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${tab === t.key ? 'bg-resort-600 text-white border-resort-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{t.label}</button>
                  ))}
                </div>
                {/* Upcoming */}
                {tab === 'upcoming' && (
                <section className="fade-in-up mb-10">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Upcoming</h2>
                  {upcoming.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                      <p className="text-slate-600">No upcoming trips</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {upcoming.map(booking => {
                        const statusClass = booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        return (
                          <div key={booking.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-resort-900">{booking.resorts?.name || `Resort ${booking.resort_id.slice(0,8)}`}</h3>
                                <p className="text-sm text-slate-600">{booking.date_from} → {booking.date_to}</p>
                              </div>
                              <span className={"text-xs px-2 py-1 rounded font-semibold " + statusClass}>{booking.status}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Link href={`/guest/trips/${booking.id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Details</Link>
                              <Link href={`/resorts/${booking.resort_id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Resort</Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
                )}

                {/* Past */}
                {tab === 'history' && (
                <section className="fade-in-up">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Past & Rejected</h2>
                  {pastOrRejected.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                      <p className="text-slate-600">No past trips yet</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {pastOrRejected.map(booking => (
                        <div key={booking.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-resort-900">{booking.resorts?.name || `Resort ${booking.resort_id.slice(0,8)}`}</h3>
                              <p className="text-sm text-slate-600">{booking.date_from} → {booking.date_to}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded font-semibold bg-slate-200 text-slate-800">{new Date(booking.date_to) < now ? 'Completed' : 'Rejected'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <Link href={`/guest/trips/${booking.id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Details</Link>
                            <Link href={`/resorts/${booking.resort_id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Resort</Link>
                            <button onClick={() => deleteBooking(booking.id)} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                )}

                {/* Current */}
                {tab === 'current' && (
                <section className="fade-in-up">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Current (Confirmed)</h2>
                  {current.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                      <p className="text-slate-600">No current confirmed trips</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {current.map(booking => (
                        <div key={booking.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-resort-900">{booking.resorts?.name || `Resort ${booking.resort_id.slice(0,8)}`}</h3>
                              <p className="text-sm text-slate-600">{booking.date_from} → {booking.date_to}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded font-semibold bg-green-100 text-green-800">Confirmed</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <Link href={`/guest/trips/${booking.id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Details</Link>
                            <Link href={`/resorts/${booking.resort_id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Resort</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                )}
              </>
            )
          })()
        )}
      </div>
    </div>
  )
}
