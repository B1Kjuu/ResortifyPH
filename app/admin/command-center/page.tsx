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
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-resort-teal font-semibold mb-2">Quality Control</p>
        <h1 className="text-4xl font-bold text-resort-900 mb-2">Moderation Command Center</h1>
        <p className="text-lg text-slate-600">Oversee listings, approvals, and ensure platform excellence</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-sm text-slate-600">Pending Resorts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-sm text-slate-600">Approved Resorts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <p className="text-sm text-slate-600">Rejected Resorts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-resort-500">{stats.total_bookings}</div>
          <p className="text-sm text-slate-600">Total Bookings</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link href="/admin/approvals" className="bg-resort-teal text-white rounded-lg p-6 hover:bg-resort-teal-dark transition">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Review Submissions</h3>
          <p className="mb-4 opacity-90">Approve or reject pending resort listings</p>
          <span className="text-sm font-semibold">Review Now →</span>
        </Link>

        <Link href="/admin/bookings-control" className="bg-resort-500 text-white rounded-lg p-6 hover:bg-resort-600 transition">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-xl font-semibold mb-2">Booking Control</h3>
          <p className="mb-4 opacity-90">Monitor and manage all reservations</p>
          <span className="text-sm font-semibold">Control →</span>
        </Link>
      </div>

      {/* Profile Info */}
      <div className="bg-resort-50 border border-resort-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-resort-900 mb-3">Your Admin Profile</h3>
        <div className="space-y-2 text-slate-700">
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> Moderator</p>
        </div>
      </div>
    </div>
  )
}
