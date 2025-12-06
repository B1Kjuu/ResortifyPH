'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function BookingsPage(){
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase.from('bookings').select('*').eq('guest_id', session.user.id)
      setBookings(data || [])
    }
    load()
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>
      <div className="grid gap-3">
        {bookings.map(b => (
          <div key={b.id} className="p-3 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">Resort: {b.resort_id}</div>
                <div className="text-sm text-slate-500">{b.date_from} → {b.date_to}</div>
              </div>
              <div className="text-sm">{b.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
