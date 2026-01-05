'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import LocationCombobox from '../../../components/LocationCombobox'
import DateRangePicker from '../../../components/DateRangePicker'
import ResortCard from '../../../components/ResortCard'
import SkeletonCard from '../../../components/SkeletonCard'
import ResortMap from '../../../components/ResortMap'
import { useGeolocation, calculateDistance } from '../../../hooks/useGeolocation'
import { getLocationCoordinates } from '../../../lib/locations'

export default function AdventureHub(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Search hero state
  const [searchLocation, setSearchLocation] = useState<string>('')
  const [searchGuests, setSearchGuests] = useState<string>('2')
  const [searchRange, setSearchRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })

  // Featured + trending
  const categories = [
    { id: 'beach', icon: '🏖️', label: 'Beachfront' },
    { id: 'mountain', icon: '🏔️', label: 'Mountains' },
    { id: 'nature', icon: '🌿', label: 'Nature' },
    { id: 'city', icon: '🏙️', label: 'City' },
    { id: 'countryside', icon: '🌾', label: 'Countryside' },
    { id: 'pool', icon: '🏊', label: 'Amazing Pools' },
    { id: 'trending', icon: '🔥', label: 'Trending' },
  ]
  const [trendingResorts, setTrendingResorts] = useState<any[]>([])
  const [trendLoading, setTrendLoading] = useState(true)

  // Favorites & Reviews
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState<boolean>(true)
  const [myReviews, setMyReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true)

  // Map preview (uses geolocation if available)
  const { position, supported: geoSupported, requestLocation, loading: geoLoading } = useGeolocation()
  const nearbyResorts = useMemo(() => {
    if (!position || trendingResorts.length === 0) return []
    const withDist = trendingResorts.map((resort) => {
      // Prefer exact coordinates, fallback to city/province center
      let lat: number | null = resort.latitude ?? null
      let lng: number | null = resort.longitude ?? null
      if (lat == null || lng == null) {
        const coords = getLocationCoordinates(resort.location)
        if (coords) { lat = coords.lat; lng = coords.lng }
      }
      if (lat == null || lng == null) return { ...resort, distance: null }
      const distance = calculateDistance(position.latitude, position.longitude, lat, lng)
      return { ...resort, distance }
    })
    .filter(r => r.distance !== null)
    .sort((a, b) => (a.distance as number) - (b.distance as number))
    .slice(0, 4)
    return withDist
  }, [position, trendingResorts])

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin')
          .eq('id', session.user.id)
          .maybeSingle()
        if (!mounted) return
        
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (userProfile?.role !== 'guest') {
          router.push('/')
          return
        }

        // First-login email gate for guests as well
        if (!userProfile.email) {
          router.push('/profile?requireEmail=1')
          return
        }

        setProfile(userProfile)
        setLoading(false)
      } catch (err) {
        console.error('Adventure hub error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    // Optionally dispatch load for SPA navigation tests
    setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)
    
    return () => { mounted = false }
  }, [])

  // Fetch favorites and reviews for the guest
  useEffect(() => {
    let mounted = true
    async function fetchGuestData(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        // Favorites joined to resorts
        const { data: favs, error: favError } = await supabase
          .from('favorites')
          .select('resort:resorts(id, name, location, price, images)')
          .eq('user_id', session.user.id)
        if (!mounted) return
        if (favError) {
          console.error('Favorites fetch error:', favError)
          setFavorites([])
        } else {
          const resorts = (favs || []).map((f: any) => f.resort).filter((r: any) => r && r.id)
          setFavorites(resorts)
        }
        setFavoritesLoading(false)

        // User reviews joined to resorts
        const { data: revs, error: revError } = await supabase
          .from('reviews')
          .select('id, rating, content, created_at, resorts:resorts(id, name)')
          .eq('guest_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(6)
        if (!mounted) return
        if (revError) {
          console.error('Reviews fetch error:', revError)
          setMyReviews([])
        } else {
          setMyReviews(revs || [])
        }
        setReviewsLoading(false)
      } catch (e) {
        console.error('Guest favorites/reviews error:', e)
        if (mounted) { setFavoritesLoading(false); setReviewsLoading(false) }
      }
    }
    fetchGuestData()
    return () => { mounted = false }
  }, [])

  // Fetch trending resorts (approved)
  useEffect(() => {
    let mounted = true
    async function fetchTrending(){
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('id, name, location, price, images, type, created_at, latitude, longitude, address')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8)
        if (!mounted) return
        if (error) {
          console.error('Trending fetch error:', error)
          setTrendingResorts([])
          setTrendLoading(false)
          return
        }
        setTrendingResorts(data || [])
        setTrendLoading(false)
      } catch (e) {
        console.error('Trending error:', e)
        if (mounted) {
          setTrendingResorts([])
          setTrendLoading(false)
        }
      }
    }
    fetchTrending()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
            <span className="text-4xl sm:text-6xl">🌴</span>
            <div>
              <p className="text-xs sm:text-sm text-resort-500 font-semibold uppercase tracking-wide">Welcome Back, {profile?.full_name?.split(' ')[0] || 'Traveler'}</p>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-resort-600 to-ocean-500 bg-clip-text text-transparent">Your Resort Adventure Hub</h1>
            </div>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
              {/* Left: stacked controls + quick picks */}
              <div className="lg:col-span-4 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                  <LocationCombobox
                    value={searchLocation}
                    onChange={(province) => setSearchLocation(province || '')}
                    placeholder="Where to?"
                    ariaLabel="Search location"
                    variant="hero"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                    aria-label="Number of guests"
                    placeholder="Enter number of guests"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-500 bg-white hover:border-slate-300 transition-all"
                  />
                </div>
                <div>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (searchLocation) params.set('location', searchLocation)
                      if (searchRange.from) params.set('dateFrom', searchRange.from.toISOString().split('T')[0])
                      if (searchRange.to) params.set('dateTo', searchRange.to.toISOString().split('T')[0])
                      if (searchGuests) params.set('guests', searchGuests)
                      router.push(`/resorts${params.toString() ? `?${params.toString()}` : ''}`)
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-resort-500 to-ocean-500 hover:from-resort-600 hover:to-ocean-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                    aria-label="Search resorts"
                  >
                    Search Resorts
                  </button>
                </div>

                {/* Quick picks below controls */}
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Quick picks</div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2">
                    <button
                      onClick={() => {
                        const today = new Date()
                        const day = today.getDay()
                        const nextFri = new Date(today)
                        nextFri.setDate(today.getDate() + ((5 - day + 7) % 7))
                        const nextSun = new Date(nextFri)
                        nextSun.setDate(nextFri.getDate() + 2)
                        setSearchRange({ from: nextFri, to: nextSun })
                      }}
                      className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-left"
                    >
                      Weekend
                    </button>
                    <button
                      onClick={() => {
                        const start = new Date()
                        const end = new Date(start)
                        end.setDate(start.getDate() + 6)
                        setSearchRange({ from: start, to: end })
                      }}
                      className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-left"
                    >
                      1 week
                    </button>
                    <button
                      onClick={() => {
                        const start = new Date()
                        const end = new Date(start)
                        end.setDate(start.getDate() + 13)
                        setSearchRange({ from: start, to: end })
                      }}
                      className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-left"
                    >
                      2 weeks
                    </button>
                    <button
                      onClick={() => setSearchRange({ from: undefined, to: undefined })}
                      className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-left"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              {/* Right: Dates only */}
              <div className="lg:col-span-8 overflow-hidden">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dates</label>
                <DateRangePicker
                  bookedDates={[]}
                  selectedRange={searchRange}
                  onSelectRange={(range) => setSearchRange(range)}
                  preferTwoMonthsOnDesktop
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12 fade-in-up">
          {/* Browse Resorts Card */}
          <Link href="/resorts" className="group bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-card hover:shadow-card-hover hover:border-resort-400 transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">🏝️</div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">Explore Paradise</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4 leading-relaxed">Find your next getaway with curated resort listings across the Philippines</p>
            <span className="inline-flex items-center text-xs sm:text-sm text-resort-600 font-bold group-hover:text-resort-700">
              Start Exploring 
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* My Bookings Card */}
          <Link href="/guest/trips" className="group bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-card hover:shadow-card-hover hover:border-resort-400 transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">🎫</div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">Your Trips</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4 leading-relaxed">View upcoming bookings, past reservations, and manage your travel plans</p>
            <span className="inline-flex items-center text-xs sm:text-sm text-resort-600 font-bold group-hover:text-resort-700">
              View Trips 
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Featured Categories */}
        <div className="mb-8 sm:mb-12 fade-in-up">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Featured Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const href = cat.id === 'pool'
                ? '/resorts?amenities=Pool'
                : cat.id === 'trending'
                ? '/resorts?sort=newest'
                : `/resorts?type=${cat.id}`
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-full text-sm font-medium hover:border-slate-900 hover:bg-slate-50 transition-colors"
                  aria-label={`Browse ${cat.label}`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Trending Resorts */}
        <div className="mb-12 fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Trending Resorts</h2>
            <Link href="/resorts" className="text-sm font-medium text-resort-600 hover:text-resort-700">View all →</Link>
          </div>
          {trendLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : trendingResorts.length === 0 ? (
            <div className="text-slate-600 text-sm">No trending resorts available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trendingResorts.map((resort) => (
                <ResortCard key={resort.id} resort={resort} compact />
              ))}
            </div>
          )}
        </div>

        {/* Nearby For You */}
        {geoSupported && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nearby For You</h2>
              {!position && (
                <button
                  onClick={() => requestLocation()}
                  className="text-sm font-medium px-3 py-1.5 border border-slate-300 rounded-lg hover:border-slate-900 transition-colors"
                >
                  {geoLoading ? 'Locating…' : 'Enable location'}
                </button>
              )}
            </div>
            {position && nearbyResorts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {nearbyResorts.map((resort: any) => (
                  <ResortCard key={resort.id} resort={resort} compact />
                ))}
              </div>
            ) : (
              <div className="text-slate-600 text-sm">{position ? 'No nearby resorts found.' : 'Turn on location to see resorts near you.'}</div>
            )}
          </div>
        )}

        {/* Map Preview */}
        <div className="mb-4 relative z-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">Map Preview</h2>
            <Link href="/resorts?view=map" className="text-sm font-medium text-resort-600 hover:text-resort-700">Open full map →</Link>
          </div>
          <div className="h-[260px] sm:h-[320px] fade-in-up rounded-xl overflow-hidden relative z-0">
            <ResortMap
              resorts={trendingResorts}
              userPosition={geoSupported && position ? position : null}
              className="h-full"
            />
          </div>
        </div>

        {/* Profile & Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 fade-in-up relative z-10">
          {/* Profile Card */}
          <Link href="/profile" className="group bg-gradient-to-br from-resort-500 to-blue-500 text-white rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-resort-400">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👤</div>
            <h3 className="text-2xl font-bold mb-3">Your Profile</h3>
            <p className="text-sm opacity-95 mb-4">{profile?.email}</p>
            <span className="inline-flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform bg-white/20 px-4 py-2 rounded-lg">
              Manage Profile →
            </span>
          </Link>

          {/* Favorites Preview */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">Favorites</h3>
              <Link href="/guest/favorites" className="text-xs font-semibold text-resort-600 hover:text-resort-700">Manage →</Link>
            </div>
            {favoritesLoading ? (
              <div className="text-sm text-slate-600">Loading favorites…</div>
            ) : favorites.length === 0 ? (
              <div className="text-sm text-slate-600">No favorites yet. Tap the heart on a resort to add it.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favorites.slice(0,6).map((r: any) => (
                  <Link key={r.id} href={`/resorts/${r.id}`} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-resort-300 transition">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {Array.isArray(r.images) && r.images.length > 0 ? (
                        <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">🏝️</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{r.name}</div>
                      <div className="text-xs text-slate-600 truncate">{r.location || '—'}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reviews Preview */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">Reviews</h3>
              <Link href="/guest/reviews" className="text-xs font-semibold text-resort-600 hover:text-resort-700">Manage →</Link>
            </div>
            {reviewsLoading ? (
              <div className="text-sm text-slate-600">Loading reviews…</div>
            ) : myReviews.length === 0 ? (
              <div className="text-sm text-slate-600">You have not posted any reviews yet.</div>
            ) : (
              <div className="space-y-3">
                {myReviews.slice(0,6).map((rev: any) => (
                  <div key={rev.id} className="p-3 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{rev.resorts?.name || 'Resort'}</div>
                      <div className="text-xs text-slate-600">{new Date(rev.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm text-slate-700">Rating: {rev.rating}/5</div>
                    {rev.content && (<div className="text-sm text-slate-600 mt-1">“{rev.content}”</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
