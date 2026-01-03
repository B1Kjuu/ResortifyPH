'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import DisclaimerBanner from '../../../components/DisclaimerBanner'

const SEASON_BUCKETS = [
  { key: 'Holiday Escapes', label: 'Holiday Escapes (Dec-Feb)', months: [12, 1, 2] },
  { key: 'Summer Peak', label: 'Summer Peak (Mar-May)', months: [3, 4, 5] },
  { key: 'Rainy Retreats', label: 'Rainy Retreats (Jun-Aug)', months: [6, 7, 8] },
  { key: 'Ber Months', label: 'Ber Months (Sep-Nov)', months: [9, 10, 11] },
]

function determineSeasonBucket(dateString?: string | null) {
  return null
}

export default function CommandCenter(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function loadStats(){
      // Load open reports for moderation queue only
      // Handle historical data where status may be stored as 'in-review' (hyphen) instead of 'in_review' (underscore)
      const { data: openReports, error } = await supabase
        .from('reports')
        .select('id, reporter_id, chat_id, message_id, target_user_id, reason, status, created_at')
        .in('status', ['open','in_review','in-review'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Reports fetch error:', error)
      }
      if (mounted) {
        setReports((openReports || []).map(r => ({
          ...r,
          // Normalize status for UI consistency
          status: r.status === 'in-review' ? 'in_review' : r.status
        })))
      }
    }
    
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
    
    // Removed resorts/bookings subscriptions; admin focuses on moderation only

    // Subscribe to reports changes
    const reportsSubscription = supabase
      .channel('admin_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          loadStats()
        }
      )
      .subscribe()
    
    return () => { 
      mounted = false
      reportsSubscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="w-full px-4 py-10 text-center text-slate-600">Loading...</div>

  

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 lg:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-12 max-w-7xl mx-auto">
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span className="text-3xl sm:text-5xl">⚖️</span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Command Center</h1>
          </div>
          <p className="text-sm sm:text-lg text-slate-600 ml-10 sm:ml-14 lg:ml-20">Oversee listings, approvals, and ensure platform excellence</p>
          <div className="mt-3 sm:mt-4 ml-10 sm:ml-14 lg:ml-20">
            <DisclaimerBanner title="Admin Notice">
              Review user reports promptly. Coordinate with owners/guests as needed, and mark status once actioned.
            </DisclaimerBanner>
          </div>
        </div>

        {/* Moderation-first: remove bookings/resort stats */}

        

        

        {/* Reports Moderation Queue */}
        <section className="mb-8 lg:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <span className="text-2xl sm:text-3xl">🚨</span>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-red-500 uppercase tracking-wide">Reports</p>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900">Open Reports ({reports.length})</h3>
            </div>
          </div>
          {reports.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl lg:rounded-2xl p-6 lg:p-8 text-center">
              <p className="text-base lg:text-lg font-bold text-slate-900 mb-2">No reports yet</p>
              <p className="text-sm text-slate-600">Newly submitted user reports will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {reports.map((r) => (
                <div key={r.id} className="bg-white border-2 border-red-200 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600">Report ID</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{r.id}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold border flex-shrink-0 ml-2 ${r.status === 'open' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-2 line-clamp-2">Reason: {r.reason}</p>
                  <p className="text-xs text-slate-600">Chat: {r.chat_id ? r.chat_id.slice(0,8) : 'N/A'}</p>
                  <p className="text-xs text-slate-600">Reporter: {r.reporter_id?.slice(0,8)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                    <button
                      className="px-3 py-2 text-xs rounded-lg border-2 border-yellow-500 bg-yellow-600 text-white"
                      onClick={async () => {
                        const { error } = await supabase.from('reports').update({ status: 'in_review' }).eq('id', r.id)
                        if (!error && profile?.id) {
                          await supabase.from('moderation_actions').insert({
                            report_id: r.id,
                            admin_id: profile.id,
                            action: 'in_review'
                          })
                        }
                      }}
                    >Mark In-Review</button>
                    <button
                      className="px-3 py-2 text-xs rounded-lg border-2 border-green-500 bg-green-600 text-white"
                      onClick={async () => {
                        const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id)
                        if (!error && profile?.id) {
                          await supabase.from('moderation_actions').insert({
                            report_id: r.id,
                            admin_id: profile.id,
                            action: 'resolved'
                          })
                        }
                      }}
                    >Resolve</button>
                    <button
                      className="px-3 py-2 text-xs rounded-lg border-2 border-slate-300 bg-slate-100 text-slate-900"
                      onClick={async () => {
                        const { error } = await supabase.from('reports').update({ status: 'rejected' }).eq('id', r.id)
                        if (!error && profile?.id) {
                          await supabase.from('moderation_actions').insert({
                            report_id: r.id,
                            admin_id: profile.id,
                            action: 'rejected'
                          })
                        }
                      }}
                    >Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admin Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8 lg:mb-10">
          <Link href="/admin/approvals" className="group bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-purple-400 hover:border-purple-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🔍</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">Resort Approvals</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">Approve or reject pending listings</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">Review →</span>
          </Link>

          <Link href="/admin/users" className="group bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-emerald-400 hover:border-emerald-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">👥</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">Users</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">View, suspend, and manage users</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">Manage →</span>
          </Link>

          <Link href="/admin/content-moderation" className="group bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-amber-400 hover:border-amber-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">Reports & Reviews</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">Handle user reports and review content</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">Moderate →</span>
          </Link>

          <Link href="/admin/disputes" className="group bg-gradient-to-br from-red-500 to-rose-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-red-400 hover:border-red-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">⚖️</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">Booking Disputes</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">Resolve guest/host conflicts</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">Resolve →</span>
          </Link>

          <Link href="/admin/resort-bookings" className="group bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-blue-400 hover:border-blue-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">📘</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">All Bookings</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">View platform booking activity</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">View →</span>
          </Link>

          <Link href="/admin/resorts" className="group bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-rose-400 hover:border-rose-300">
            <div className="text-2xl lg:text-4xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🏖️</div>
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-1 lg:mb-2">Active Resorts</h3>
            <p className="hidden sm:block mb-2 lg:mb-4 opacity-95 text-xs lg:text-sm">Browse approved resorts with stats</p>
            <span className="inline-block text-[10px] lg:text-xs font-bold group-hover:translate-x-2 transition-transform bg-white/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">Browse →</span>
          </Link>
        </div>

        {/* Platform Quick Stats */}
        <div className="bg-white border border-slate-200 rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/admin/announcements" className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-purple-50 rounded-xl transition-colors group">
              <span className="text-2xl group-hover:scale-110 transition-transform">📢</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Announcements</p>
                <p className="text-xs text-slate-500">Post site-wide notices</p>
              </div>
            </Link>
            <Link href="/admin/verifications" className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group">
              <span className="text-2xl group-hover:scale-110 transition-transform">🪪</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">ID Verifications</p>
                <p className="text-xs text-slate-500">Review user documents</p>
              </div>
            </Link>
            <Link href="/admin/analytics" className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl transition-colors group">
              <span className="text-2xl group-hover:scale-110 transition-transform">📈</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Analytics</p>
                <p className="text-xs text-slate-500">Platform insights</p>
              </div>
            </Link>
            <Link href="/admin/system-health" className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors group">
              <span className="text-2xl group-hover:scale-110 transition-transform">💓</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">System Health</p>
                <p className="text-xs text-slate-500">Monitor status</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
