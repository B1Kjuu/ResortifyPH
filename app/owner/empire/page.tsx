'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Empire(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ totalBookings: 0, pending: 0, confirmed: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
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
        
        if (mounted) {
          setProfile(userProfile)
          setStats(statsData)
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

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

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

        {/* Profile Info */}
        <div className="bg-gradient-to-br from-resort-50 to-blue-50 border-2 border-resort-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">👤</span>
            <h3 className="text-2xl font-bold text-resort-900">Your Profile</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-1">📧 Email Address</p>
              <p className="text-lg font-bold text-slate-900">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-1">📝 Full Name</p>
              <p className="text-lg font-bold text-slate-900">{profile?.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-1">🏨 Account Type</p>
              <p className="text-lg font-bold text-resort-600">Resort Owner</p>
            </div>
          </div>
          <Link href="/profile" className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all">
            ✏️ Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
