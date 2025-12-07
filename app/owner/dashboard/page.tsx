'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function OwnerDashboard(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Verify owner role
      const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (userProfile?.role !== 'owner') {
        router.push('/')
        return
      }

      setProfile(userProfile)

      // Get resort stats
      const { data: resorts } = await supabase.from('resorts').select('status').eq('owner_id', session.user.id)
      const stats = {
        total: resorts?.length || 0,
        pending: resorts?.filter(r => r.status === 'pending').length || 0,
        approved: resorts?.filter(r => r.status === 'approved').length || 0,
        rejected: resorts?.filter(r => r.status === 'rejected').length || 0,
      }
      setStats(stats)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-resort-500 font-semibold mb-2">Resort Management</p>
        <h1 className="text-4xl font-bold text-resort-900 mb-2">Your Resort Empire</h1>
        <p className="text-lg text-slate-600">Manage listings, track submissions, and grow your business</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-resort-500">{stats.total}</div>
          <p className="text-sm text-slate-600">Total Resorts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-sm text-slate-600">Pending Approval</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-sm text-slate-600">Approved</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <p className="text-sm text-slate-600">Rejected</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link href="/owner/create-resort" className="bg-resort-500 text-white rounded-lg p-6 hover:bg-resort-600 transition">
          <div className="text-4xl mb-3">🏗️</div>
          <h3 className="text-xl font-semibold mb-2">Launch New Resort</h3>
          <p className="mb-4 opacity-90">Submit your property for approval</p>
          <span className="text-sm font-semibold">Get Started →</span>
        </Link>

        <Link href="/owner/my-resorts" className="bg-resort-teal text-white rounded-lg p-6 hover:bg-resort-teal-dark transition">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-xl font-semibold mb-2">Manage Properties</h3>
          <p className="mb-4 opacity-90">Edit listings and monitor status</p>
          <span className="text-sm font-semibold">Manage →</span>
        </Link>
      </div>

      {/* Profile Info */}
      <div className="bg-resort-50 border border-resort-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-resort-900 mb-3">Your Profile</h3>
        <div className="space-y-2 text-slate-700">
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> Resort Owner</p>
        </div>
      </div>
    </div>
  )
}
