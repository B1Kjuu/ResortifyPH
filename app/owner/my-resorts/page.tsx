'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { FiMapPin, FiClock, FiCheck, FiX, FiUsers, FiEdit, FiEye } from 'react-icons/fi'
import { FaHotel } from 'react-icons/fa'

export default function MyResorts(){
  const [resorts, setResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Verify owner role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile || profile.role !== 'owner') {
        router.push('/owner/dashboard')
        return
      }

      // First-login email gate
      if (!profile.email) {
        router.push('/profile?requireEmail=1')
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
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">← Back to Dashboard</Link>
        
        <div className="flex justify-between items-start mb-10 gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <FaHotel className="w-10 h-10 text-slate-700" />
            <div>
              <h1 className="text-4xl font-bold text-slate-900">My Resorts</h1>
              <p className="text-lg text-slate-600 mt-1">Manage your resort listings</p>
              <div className="mt-4">
                <DisclaimerBanner title="Owner Payment Notice">
                  ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
                </DisclaimerBanner>
              </div>
            </div>
          </div>
          <Link href="/owner/create-resort" className="px-8 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400 whitespace-nowrap">
            ➕ Create Resort
          </Link>
        </div>

        {resorts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-2xl font-bold text-slate-900 mb-2">🏝️ No resorts yet</p>
            <p className="text-slate-600 mb-6 text-lg">Start by creating your first resort listing!</p>
            <Link href="/owner/create-resort" className="inline-block px-8 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Create your first resort →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {resorts.map(resort => (
              <div key={resort.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-resort-400 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-resort-600 transition">{resort.name}</h3>
                    <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {resort.location}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-lg font-bold border-2 whitespace-nowrap ${
                    resort.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                    resort.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      {resort.status === 'approved' ? <FiCheck className="w-4 h-4" /> : resort.status === 'pending' ? <FiClock className="w-4 h-4" /> : <FiX className="w-4 h-4" />}
                      {resort.status}
                    </span>
                  </span>
                </div>

                <div className="space-y-1 text-sm text-slate-700 mb-4 pb-4 border-b border-slate-100">
                  <p>₱{resort.price}/night · <span className="inline-flex items-center gap-1"><FiUsers className="w-4 h-4" /> {resort.capacity} {resort.capacity === 1 ? 'guest' : 'guests'}</span></p>
                  {resort.amenities && <p>Amenities: {resort.amenities.join(', ')}</p>}
                </div>

                <p className="text-sm text-slate-600 mb-6 line-clamp-2 italic">{resort.description}</p>

                <div className="flex gap-3">
                  <Link href={`/owner/edit-resort/${resort.id}`} className="flex-1 px-4 py-3 text-sm font-bold border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition text-center inline-flex items-center justify-center gap-2">
                    <FiEdit className="w-4 h-4" /> Edit
                  </Link>
                  <Link href={`/resorts/${resort.id}`} className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400 text-center inline-flex items-center justify-center gap-2">
                    <FiEye className="w-4 h-4" /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
