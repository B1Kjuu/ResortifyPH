'use client'
import React, { useEffect, useMemo, useState } from 'react'
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
          .select('*')
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
          <div className="grid md:grid-cols-2 gap-6 fade-in-up">
            {bookings.map(booking => {
              const statusClass = booking.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : booking.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
              return (
                <div key={booking.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-resort-900">Resort ID: {booking.resort_id}</h3>
                      <p className="text-sm text-slate-600">{booking.date_from} → {booking.date_to}</p>
                    </div>
                    <span className={"text-xs px-2 py-1 rounded font-semibold " + statusClass}>{booking.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
