'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Properties(){
  const [resorts, setResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }

      // Verify owner role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'owner') {
        router.push('/owner/empire')
        return
      }

      const { data } = await supabase.from('resorts').select('*').eq('owner_id', session.user.id).order('created_at', { ascending: false })
      setResorts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Empire</Link>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-resort-900">Your Properties</h1>
          <p className="text-slate-600">Manage and track all your resort listings</p>
        </div>
        <Link href="/owner/launch-resort" className="px-4 py-2 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition">
          + Launch Resort
        </Link>
      </div>

      {resorts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No properties yet</p>
          <Link href="/owner/launch-resort" className="text-resort-500 font-semibold">Launch your first resort →</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {resorts.map(resort => (
            <div key={resort.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-resort-900">{resort.name}</h3>
                  <p className="text-sm text-slate-600">{resort.location}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  resort.status === 'approved' ? 'bg-green-100 text-green-800' :
                  resort.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {resort.status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-4">
                <p>₱{resort.price}/night · {resort.capacity} guests</p>
                {resort.amenities && <p>Amenities: {resort.amenities.join(', ')}</p>}
              </div>

              <p className="text-sm text-slate-700 mb-4 line-clamp-2">{resort.description}</p>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 transition">Edit</button>
                <Link href={`/resorts/${resort.id}`} className="flex-1 px-3 py-2 text-sm bg-resort-500 text-white rounded hover:bg-resort-600 transition text-center">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
