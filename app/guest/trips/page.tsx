'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import SkeletonTable from '../../../components/SkeletonTable'

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
          router.push('/auth/login')
          return 
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href="/guest/adventure-hub" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Hub</Link>
        <h1 className="text-3xl font-bold text-resort-900">Your Trips</h1>
        <p className="text-slate-600">View and manage all your resort bookings</p>
      </div>

      {loading ? (
        <SkeletonTable rows={3} />
      ) : bookings.length === 0 ? (

        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No trips yet</p>
          <Link href="/resorts" className="text-resort-500 font-semibold">Start exploring →</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-resort-900">Resort ID: {booking.resort_id}</h3>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
