'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { FiEye, FiMapPin, FiUsers, FiCalendar, FiDollarSign, FiStar, FiSearch, FiFilter, FiChevronDown } from 'react-icons/fi'

interface Resort {
  id: string
  slug?: string | null
  name: string
  location: string
  price: number
  capacity: number
  status: string
  created_at: string
  images?: string[]
  owner?: { full_name: string; email: string }
  _count?: {
    bookings: number
    reviews: number
  }
  _avg_rating?: number
  _total_revenue?: number
}

export default function AdminActiveResortsPage(){
  const [resorts, setResorts] = useState<Resort[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'approved' | 'all'>('approved')
  const [selectedResort, setSelectedResort] = useState<Resort | null>(null)
  const [resortStats, setResortStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const router = useRouter()

  async function loadResorts(){
    let query = supabase
      .from('resorts')
      .select('*, owner:profiles(full_name, email)')
      .order('created_at', { ascending: false })
    
    if (filterStatus === 'approved') {
      query = query.eq('status', 'approved')
    } else {
      // Show all except pending (pending is in Approvals page)
      query = query.neq('status', 'pending')
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error loading resorts:', error)
    } else {
      setResorts(data || [])
    }
  }

  async function loadResortStats(resortId: string) {
    setStatsLoading(true)
    try {
      // Load bookings count and revenue
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price, status')
        .eq('resort_id', resortId)

      // Load reviews with ratings
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating')
        .eq('resort_id', resortId)

      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'completed') || []
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
      const avgRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0

      setResortStats({
        totalBookings: bookings?.length || 0,
        confirmedBookings: confirmedBookings.length,
        totalRevenue,
        totalReviews: reviews?.length || 0,
        avgRating: avgRating.toFixed(1)
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    async function checkAdminAndLoad(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile?.is_admin) { router.push('/'); return }

      setIsAdmin(true)
      await loadResorts()
      setLoading(false)
    }
    checkAdminAndLoad()
  }, [router])

  useEffect(() => {
    if (isAdmin) {
      loadResorts()
    }
  }, [filterStatus, isAdmin])

  useEffect(() => {
    if (selectedResort) {
      loadResortStats(selectedResort.id)
    }
  }, [selectedResort])

  const filteredResorts = resorts.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="w-full px-4 py-10 text-center text-slate-600">Loading resorts...</div>
  if (!isAdmin) return <div className="w-full px-4 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full px-4 py-6 lg:py-10 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pb-20 lg:pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs lg:text-sm font-semibold text-emerald-600">Resort Management</p>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">Active Resorts</h1>
          <p className="text-sm text-slate-600 mt-1">View and monitor all approved resorts on the platform</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, location, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'approved' | 'all')}
              className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="approved">Approved Only</option>
              <option value="all">All (excl. Pending)</option>
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl font-bold text-emerald-600">{filteredResorts.length}</p>
            <p className="text-xs text-slate-600">Total Resorts</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl font-bold text-blue-600">{filteredResorts.filter(r => r.status === 'approved').length}</p>
            <p className="text-xs text-slate-600">Active</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl font-bold text-amber-600">{filteredResorts.filter(r => r.status === 'suspended').length}</p>
            <p className="text-xs text-slate-600">Suspended</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl font-bold text-red-600">{filteredResorts.filter(r => r.status === 'rejected').length}</p>
            <p className="text-xs text-slate-600">Rejected</p>
          </div>
        </div>

        {/* Resort Grid */}
        {filteredResorts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-600">
            <p className="font-semibold text-slate-900 mb-1">No resorts found</p>
            <p className="text-sm">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredResorts.map(resort => (
              <div 
                key={resort.id} 
                className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  selectedResort?.id === resort.id ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'
                }`}
                onClick={() => setSelectedResort(selectedResort?.id === resort.id ? null : resort)}
              >
                {/* Resort Image */}
                <div className="h-32 bg-gradient-to-br from-emerald-100 to-teal-100 relative">
                  {resort.images?.[0] && (
                    <img src={resort.images[0]} alt={resort.name} className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded-lg font-semibold ${
                    resort.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    resort.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {resort.status}
                  </span>
                </div>

                {/* Resort Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 truncate">{resort.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <FiMapPin className="w-3 h-3" />
                    <span className="truncate">{resort.location}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <FiDollarSign className="w-3 h-3" />
                      ₱{resort.price?.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-3 h-3" />
                      {resort.capacity} guests
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Owner: {resort.owner?.full_name || 'Unknown'}
                  </p>

                  {/* Expanded Stats */}
                  {selectedResort?.id === resort.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {statsLoading ? (
                        <div className="text-center py-4">
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : resortStats ? (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-700">Resort Statistics</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-blue-600">{resortStats.totalBookings}</p>
                              <p className="text-[10px] text-slate-500">Total Bookings</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-emerald-600">₱{resortStats.totalRevenue?.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-500">Est. Revenue</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-amber-600">{resortStats.totalReviews}</p>
                              <p className="text-[10px] text-slate-500">Reviews</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-purple-600 flex items-center gap-1">
                                <FiStar className="w-4 h-4" />
                                {resortStats.avgRating}
                              </p>
                              <p className="text-[10px] text-slate-500">Avg Rating</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link 
                              href={`/resorts/${resort.slug || resort.id}`}
                              className="flex-1 text-center px-3 py-2 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiEye className="w-3 h-3 inline mr-1" />
                              View Page
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
