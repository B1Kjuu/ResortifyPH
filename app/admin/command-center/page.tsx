'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function CommandCenter(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total_bookings: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function loadStats(){
      // Get stats
      const { data: resorts } = await supabase.from('resorts').select('status')
      const { data: bookings } = await supabase.from('bookings').select('id')
      
      const statsData = {
        pending: resorts?.filter(r => r.status === 'pending').length || 0,
        approved: resorts?.filter(r => r.status === 'approved').length || 0,
        rejected: resorts?.filter(r => r.status === 'rejected').length || 0,
        total_bookings: bookings?.length || 0,
      }
      
      if (mounted) {
        setStats(statsData)
      }
    }
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }

        const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (!userProfile?.is_admin) {
          router.push('/')
          return
        }

        if (mounted) {
          setProfile(userProfile)
          setLoading(false)
        }
        
        // Load initial stats
        await loadStats()
      } catch (err) {
        console.error('Command center error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    // Subscribe to real-time changes for resorts
    const resortsSubscription = supabase
      .channel('admin_resorts_stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resorts' },
        () => {
          loadStats()
        }
      )
      .subscribe()
    
    // Subscribe to real-time changes for bookings
    const bookingsSubscription = supabase
      .channel('admin_bookings_stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadStats()
        }
      )
      .subscribe()
    
    return () => { 
      mounted = false
      resortsSubscription.unsubscribe()
      bookingsSubscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">⚖️</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Moderation Command Center</h1>
          </div>
          <p className="text-lg text-slate-600 ml-20">Oversee listings, approvals, and ensure platform excellence</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-5 mb-10">
          <div className="bg-white border-2 border-yellow-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Pending Review</p>
                <div className="text-4xl font-bold text-yellow-600">{stats.pending}</div>
              </div>
              <span className="text-5xl opacity-30">⏳</span>
            </div>
          </div>
          <div className="bg-white border-2 border-green-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Approved</p>
                <div className="text-4xl font-bold text-green-600">{stats.approved}</div>
              </div>
              <span className="text-5xl opacity-30">✅</span>
            </div>
          </div>
          <div className="bg-white border-2 border-red-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Rejected</p>
                <div className="text-4xl font-bold text-red-600">{stats.rejected}</div>
              </div>
              <span className="text-5xl opacity-30">❌</span>
            </div>
          </div>
          <div className="bg-white border-2 border-blue-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold mb-2">Active Bookings</p>
                <div className="text-4xl font-bold text-blue-600">{stats.total_bookings}</div>
              </div>
              <span className="text-5xl opacity-30">📅</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Link href="/admin/approvals" className="group bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-purple-400 hover:border-purple-300">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔍</div>
            <h3 className="text-2xl font-bold mb-3">Review Submissions</h3>
            <p className="mb-6 opacity-95 text-lg">Approve or reject pending resort listings</p>
            <span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">Review Now →</span>
          </Link>

          <Link href="/admin/bookings-control" className="group bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-orange-400 hover:border-orange-300">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
            <h3 className="text-2xl font-bold mb-3">Booking Control</h3>
            <p className="mb-6 opacity-95 text-lg">Monitor and manage all reservations</p>
            <span className="inline-block text-sm font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-4 py-2 rounded-lg">Control →</span>
          </Link>
        </div>

        {/* Profile Info */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔐</span>
            <h3 className="text-2xl font-bold text-purple-900">Your Admin Profile</h3>
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
              <p className="text-sm font-semibold text-slate-600 mb-1">🛡️ Admin Role</p>
              <p className="text-lg font-bold text-purple-600">System Moderator</p>
            </div>
          </div>
          <Link href="/profile" className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all">
            ✏️ Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
