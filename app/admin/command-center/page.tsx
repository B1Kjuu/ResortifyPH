'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { getProvinceInfo } from '../../../lib/locations'
import { useRouter } from 'next/navigation'

const SEASON_BUCKETS = [
  { key: 'Holiday Escapes', label: 'Holiday Escapes (Dec-Feb)', months: [12, 1, 2] },
  { key: 'Summer Peak', label: 'Summer Peak (Mar-May)', months: [3, 4, 5] },
  { key: 'Rainy Retreats', label: 'Rainy Retreats (Jun-Aug)', months: [6, 7, 8] },
  { key: 'Ber Months', label: 'Ber Months (Sep-Nov)', months: [9, 10, 11] },
]

function determineSeasonBucket(dateString?: string | null) {
  if (!dateString) return null
  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return null
  const month = parsedDate.getUTCMonth() + 1
  return SEASON_BUCKETS.find(bucket => bucket.months.includes(month)) || null
}

export default function CommandCenter(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total_bookings: 0 })
  const [regionStats, setRegionStats] = useState<{ region: string; code: string; count: number }[]>([])
  const [bookingRegionStats, setBookingRegionStats] = useState<{ region: string; count: number }[]>([])
  const [seasonalStats, setSeasonalStats] = useState(
    SEASON_BUCKETS.map(bucket => ({ season: bucket.key, label: bucket.label, count: 0 }))
  )
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function loadStats(){
      const { data: resorts } = await supabase.from('resorts').select('status, location, region_code, region_name')
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, resort_region_name, resort_region_code, date_from, created_at')

      const statsData = {
        pending: resorts?.filter(r => r.status === 'pending').length || 0,
        approved: resorts?.filter(r => r.status === 'approved').length || 0,
        rejected: resorts?.filter(r => r.status === 'rejected').length || 0,
        total_bookings: bookings?.length || 0,
      }

      const regionMap = new Map<string, { region: string; code: string; count: number }>()
      resorts?.forEach((resort) => {
        const info = resort.region_name && resort.region_code
          ? { regionName: resort.region_name as string, regionCode: resort.region_code as string }
          : getProvinceInfo(resort.location)

        if (!info || !info.regionCode) return
        const current = regionMap.get(info.regionCode)
        if (current) {
          current.count += 1
        } else {
          regionMap.set(info.regionCode, { region: info.regionName, code: info.regionCode, count: 1 })
        }
      })

      const topRegions = Array.from(regionMap.values()).sort((a, b) => b.count - a.count).slice(0, 6)

      const bookingRegionMap = new Map<string, number>()
      const seasonalMap = new Map<string, number>()

      bookings?.forEach((booking) => {
        const regionLabel = booking.resort_region_name || 'Unmapped Region'
        bookingRegionMap.set(regionLabel, (bookingRegionMap.get(regionLabel) || 0) + 1)

        const seasonBucket = determineSeasonBucket(booking.date_from || booking.created_at)
        if (seasonBucket) {
          seasonalMap.set(seasonBucket.key, (seasonalMap.get(seasonBucket.key) || 0) + 1)
        }
      })

      const bookingRegionArray = Array.from(bookingRegionMap.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      const seasonalArray = SEASON_BUCKETS.map(bucket => ({
        season: bucket.key,
        label: bucket.label,
        count: seasonalMap.get(bucket.key) || 0,
      }))

      if (mounted) {
        setStats(statsData)
        setRegionStats(topRegions)
        setBookingRegionStats(bookingRegionArray)
        setSeasonalStats(seasonalArray)
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

  const leadingRegionCount = bookingRegionStats.reduce((max, stat) => Math.max(max, stat.count), 0) || 1
  const dominantSeasonCount = seasonalStats.reduce((max, stat) => Math.max(max, stat.count), 0) || 1
  const hasSeasonalData = seasonalStats.some(stat => stat.count > 0)

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

        <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-sm mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🗺️</span>
            <div>
              <p className="text-sm font-semibold text-blue-500 uppercase tracking-wide">Regional Coverage</p>
              <h3 className="text-2xl font-bold text-slate-900">Top Performing Regions</h3>
            </div>
          </div>
          {regionStats.length > 0 ? (
            <ul className="space-y-3">
              {regionStats.map((region, index) => (
                <li
                  key={region.code}
                  className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-3 hover:border-blue-200 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Rank {index + 1}</p>
                    <p className="text-lg font-bold text-slate-900">{region.region}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {region.count} resort{region.count === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Set the location for each resort to unlock geographic insights.</p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📍</span>
              <div>
                <p className="text-sm font-semibold text-emerald-500 uppercase tracking-wide">Booking Hotspots</p>
                <h3 className="text-2xl font-bold text-slate-900">Where Guests Reserve</h3>
              </div>
            </div>
            {bookingRegionStats.length > 0 ? (
              <ul className="space-y-3">
                {bookingRegionStats.map(region => (
                  <li key={region.region} className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-base font-semibold text-slate-900">{region.region}</p>
                      <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {region.count} booking{region.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                        style={{ width: `${Math.max((region.count / leadingRegionCount) * 100, 8)}%` }}
                      ></div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Once bookings come in with province metadata, we'll highlight the hottest demand pockets here.
              </p>
            )}
          </div>

          <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">☀️</span>
              <div>
                <p className="text-sm font-semibold text-amber-500 uppercase tracking-wide">Seasonal Pulse</p>
                <h3 className="text-2xl font-bold text-slate-900">When Guests Travel</h3>
              </div>
            </div>
            {hasSeasonalData ? (
              <ul className="space-y-3">
                {seasonalStats.map(season => (
                  <li key={season.season} className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-base font-semibold text-slate-900">{season.label}</p>
                      <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        {season.count} booking{season.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-amber-300 to-amber-500 rounded-full"
                        style={{ width: `${Math.max((season.count / dominantSeasonCount) * 100, 6)}%` }}
                      ></div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                We'll plot seasonality once bookings begin. The more confirmed trips, the richer this pulse gets.
              </p>
            )}
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
