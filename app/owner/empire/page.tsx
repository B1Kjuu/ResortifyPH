'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { eachDayOfInterval } from 'date-fns'

export default function Empire(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ totalBookings: 0, pending: 0, confirmed: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedResortId, setSelectedResortId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayBookings, setSelectedDayBookings] = useState<any[]>([])
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number, y: number, text: string } | null>(null)
  const calendarRef = React.useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin')
          .eq('id', session.user.id)
          .single()
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (userProfile?.role !== 'owner') {
          router.push('/')
          return
        }

        // Get all resort IDs owned by the user
        const { data: resorts } = await supabase
          .from('resorts')
          .select('id')
          .eq('owner_id', session.user.id)

        let statsData = { totalBookings: 0, pending: 0, confirmed: 0, rejected: 0 }

        if (resorts && resorts.length > 0) {
          const resortIds = resorts.map(r => r.id)

          const { data: bookings } = await supabase
            .from('bookings')
            .select('status')
            .in('resort_id', resortIds)

          if (bookings && bookings.length > 0) {
            const pending = bookings.filter(b => b.status === 'pending').length
            const confirmed = bookings.filter(b => b.status === 'confirmed').length
            const rejected = bookings.filter(b => ['rejected', 'cancelled', 'canceled'].includes((b.status || '').toLowerCase())).length

            statsData = {
              totalBookings: bookings.length,
              pending,
              confirmed,
              rejected
            }
          }
        }
        
        // Load enriched bookings via RPC for this owner
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_owner_bookings')
        if (rpcError) {
          console.error('Owner bookings RPC error:', rpcError)
        }

        const enrichedBookings = (rpcData || []).map((row: any) => ({
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

        if (mounted) {
          setProfile(userProfile)
          setStats(statsData)
          setBookings(enrichedBookings)
          setLoading(false)
        }
      } catch (err) {
        console.error('Empire error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    return () => { mounted = false }
  }, [])

  // Avoid early returns before hooks; render loading state inline if needed

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const resortOptions = useMemo(() => {
    const map = new Map<string,string>()
    bookings.forEach(b => {
      if (b.resort_id) map.set(b.resort_id, b.resort?.name || 'Resort')
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [bookings])

  const bookedDatesForCalendar = useMemo(() => {
    const dates: Date[] = []
    const seen = new Set<string>()
    confirmedBookings
      .filter(b => selectedResortId === 'all' || b.resort_id === selectedResortId)
      .forEach(b => {
        const start = new Date(b.date_from)
        const end = new Date(b.date_to)
        eachDayOfInterval({ start, end }).forEach(d => {
          const key = d.toISOString().slice(0,10)
          if (!seen.has(key)) {
            seen.add(key)
            dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
          }
        })
      })
    return dates
  }, [confirmedBookings, selectedResortId])

  const dateToBookings = useMemo(() => {
    const map = new Map<string, any[]>()
    confirmedBookings
      .filter(b => selectedResortId === 'all' || b.resort_id === selectedResortId)
      .forEach(b => {
        const start = new Date(b.date_from)
        const end = new Date(b.date_to)
        eachDayOfInterval({ start, end }).forEach(d => {
          const key = d.toISOString().slice(0,10)
          const arr = map.get(key) || []
          arr.push(b)
          map.set(key, arr)
        })
      })
    return map
  }, [confirmedBookings, selectedResortId])

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">🏯</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Your Resort Empire</h1>
          </div>
          <p className="text-lg text-slate-600 ml-20">Manage listings, track submissions, and grow your business</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-5 mb-10">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-resort-400 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Total Bookings</p>
                <div className="text-4xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">{stats.totalBookings}</div>
              </div>
              <span className="text-5xl opacity-30">📊</span>
            </div>
          </div>
          <div className="bg-white border-2 border-yellow-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Pending Requests</p>
                <div className="text-4xl font-bold text-yellow-600">{stats.pending}</div>
              </div>
              <span className="text-5xl opacity-30">⏳</span>
            </div>
          </div>
          <div className="bg-white border-2 border-green-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Confirmed Stays</p>
                <div className="text-4xl font-bold text-green-600">{stats.confirmed}</div>
              </div>
              <span className="text-5xl opacity-30">✅</span>
            </div>
          </div>
          <div className="bg-white border-2 border-red-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Rejected / Cancelled</p>
                <div className="text-4xl font-bold text-red-600">{stats.rejected}</div>
              </div>
              <span className="text-5xl opacity-30">❌</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Link href="/owner/create-resort" className="group bg-gradient-to-br from-resort-500 to-blue-500 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-resort-400 hover:border-resort-300">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🏗️</div>
            <h3 className="text-2xl font-bold mb-3">Launch New Resort</h3>
            <p className="mb-6 opacity-95 text-lg">Submit your property for approval</p>
            <span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">Get Started →</span>
          </Link>

          <Link href="/owner/my-resorts" className="group bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-emerald-400 hover:border-emerald-300">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📊</div>
            <h3 className="text-2xl font-bold mb-3">Manage Properties</h3>
            <p className="mb-6 opacity-95 text-lg">Edit listings and monitor status</p>
            <span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">Manage →</span>
          </Link>

          <Link href="/owner/bookings" className="group bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-cyan-400 hover:border-cyan-300">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📬</div>
            <h3 className="text-2xl font-bold mb-3">Booking Requests</h3>
            <p className="mb-6 opacity-95 text-lg">Review and confirm guest bookings</p>
            <span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">View Requests →</span>
          </Link>
        </div>

        {/* Owner profile quick card removed per request */}

        {/* Calendar Overview */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗓️</span>
              <h2 className="text-3xl font-bold text-slate-900">Bookings Calendar</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Resort:</label>
              <select
                value={selectedResortId}
                onChange={(e) => setSelectedResortId(e.target.value)}
                className="px-3 py-2 border-2 border-slate-200 rounded-xl bg-white text-slate-900"
              >
                <option value="all">All resorts</option>
                {resortOptions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
            <div ref={calendarRef} className="relative">
              <DayPicker
                numberOfMonths={2}
                mode="single"
                modifiers={{ booked: bookedDatesForCalendar }}
                modifiersClassNames={{ booked: 'day-booked' }}
                styles={{ months: { display: 'flex', gap: '16px' } }}
                onDayClick={(day, modifiers) => {
                  const key = day.toISOString().slice(0,10)
                  const bookingsForDay = dateToBookings.get(key) || []
                  if (!modifiers.booked || bookingsForDay.length === 0) return
                  setSelectedDate(day)
                  setSelectedDayBookings(bookingsForDay)
                }}
                onDayMouseEnter={(day, modifiers, e: any) => {
                  const key = day.toISOString().slice(0,10)
                  const bookingsForDay = dateToBookings.get(key) || []
                  if (!modifiers.booked || bookingsForDay.length === 0) {
                    setHoverTooltip(null)
                    return
                  }
                  const summary = bookingsForDay.slice(0,3).map((b: any) => `${b.resort?.name || 'Resort'} — ${b.guest?.full_name || 'Guest'} (${b.date_from} → ${b.date_to})`).join('\n')
                  const rect = calendarRef.current?.getBoundingClientRect()
                  const x = rect ? e.clientX - rect.left + 12 : 0
                  const y = rect ? e.clientY - rect.top + 12 : 0
                  setHoverTooltip({ x, y, text: summary })
                }}
                onDayMouseLeave={() => setHoverTooltip(null)}
              />
              {hoverTooltip && (
                <div
                  className="absolute z-50 pointer-events-none bg-slate-900 text-white text-xs rounded-md px-2 py-1 shadow"
                  style={{ left: hoverTooltip.x, top: hoverTooltip.y, whiteSpace: 'pre-line' }}
                >
                  {hoverTooltip.text}
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-2">Red-marked dates are already booked.</p>
            {selectedDate && selectedDayBookings.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => { setSelectedDate(null); setSelectedDayBookings([]) }} />
                <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-xl w-[95%] max-w-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Bookings on {selectedDate.toLocaleDateString()}</h3>
                      <p className="text-slate-600">Open detailed requests in Bookings</p>
                    </div>
                    <button
                      className="px-3 py-2 rounded-lg border-2 border-slate-200 hover:bg-slate-50"
                      onClick={() => { setSelectedDate(null); setSelectedDayBookings([]) }}
                    >✖ Close</button>
                  </div>
                  <div className="space-y-4">
                    {selectedDayBookings.map((b: any) => (
                      <div key={b.id} className="border-2 border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-600">Resort</p>
                            <p className="text-lg font-bold text-slate-900">{b.resort?.name}</p>
                            <p className="text-sm text-slate-600 mt-1">👤 {b.guest?.full_name} — 📧 {b.guest?.email}</p>
                            <p className="text-sm text-slate-700 mt-1">📅 {b.date_from} → {b.date_to}</p>
                            <p className="text-sm text-slate-700 mt-1">👥 {b.guest_count} {b.guest_count === 1 ? 'guest' : 'guests'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs px-2 py-1 rounded-lg border-2 ${b.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}">{b.status}</span>
                            <Link href={`/owner/bookings`}
                              className="px-3 py-2 rounded-lg border-2 border-slate-200 hover:bg-slate-50"
                            >View Requests</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
