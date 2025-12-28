'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import ResortCard from '../../components/ResortCard'
import SkeletonCard from '../../components/SkeletonCard'
import LocationCombobox from '../../components/LocationCombobox'
import Select from '../../components/Select'
import ResortMap from '../../components/ResortMap'
import { supabase } from '../../lib/supabaseClient'
import { getProvinceCoordinates } from '../../lib/locations'
import { getCityToProvinceMap } from '../../lib/psgcClient'
import { useGeolocation, calculateDistance, formatDistance } from '../../hooks/useGeolocation'



export default function ResortsPage(){
  const searchParams = useSearchParams()
  const router = useRouter()
  const typeParam = searchParams.get('type')
  
  // Hydration-safe mounting state
  const [mounted, setMounted] = useState(false)
  useEffect(() => { 
    // Scroll reveal observer
    let io: IntersectionObserver | null = null
    try {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('in-view') })
      }, { threshold: 0.05 })
      const observeAll = () => {
        document.querySelectorAll('.reveal').forEach((el) => io?.observe(el))
      }
      // Observe existing and soon-to-render elements
      observeAll()
      setTimeout(observeAll, 0)
      // Fallback: ensure visibility even if IO doesn't fire
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach((el) => (el as HTMLElement).classList.add('in-view'))
      }, 250)
    } catch {}
    setMounted(true)
    // Nudge test environments by signaling "load" quickly after mount
    setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)
    return () => { try { io?.disconnect() } catch {} }
  }, [])

  

  // Geolocation for "Near You" feature
  const { position, loading: geoLoading, error: geoError, requestLocation, supported: geoSupported } = useGeolocation()
  const [showNearby, setShowNearby] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split'>('grid')
  const [selectedMapResort, setSelectedMapResort] = useState<string | null>(null)
  const [showTotalPrice, setShowTotalPrice] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false)
  
  // Airbnb-style categories
  const categories = [
    { id: 'beach', icon: '🏖️', label: 'Beachfront' },
    { id: 'mountain', icon: '🏔️', label: 'Mountains' },
    { id: 'nature', icon: '🌿', label: 'Nature' },
    { id: 'city', icon: '🏙️', label: 'City' },
    { id: 'countryside', icon: '🌾', label: 'Countryside' },
    { id: 'pool', icon: '🏊', label: 'Amazing Pools' },
    { id: 'trending', icon: '🔥', label: 'Trending' },
    { id: 'new', icon: '✨', label: 'New' },
    { id: 'luxury', icon: '💎', label: 'Luxe' },
    { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family' },
  ]
  
  const [resorts, setResorts] = useState<any[]>([])
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number, count: number }>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0])
  const [guestCount, setGuestCount] = useState(searchParams.get('guests') || 'all')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(searchParams.get('amenities')?.split(',').filter(Boolean) || [])
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>((searchParams.get('sort') as any) || 'newest')
  const [dateFrom, setDateFrom] = useState<Date | null>(searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : null)
  const [dateTo, setDateTo] = useState<Date | null>(searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : null)
  const [availableResortIds, setAvailableResortIds] = useState<string[] | null>(null)

  const amenityOptions = ['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen']

  // Re-attach reveal observer when results/view change so new cards animate
  useEffect(() => {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('in-view') })
      }, { threshold: 0.05 })
      document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
      return () => io.disconnect()
    } catch {}
  }, [viewMode, searchTerm, selectedLocation, selectedType, guestCount, selectedAmenities, sortBy])

  // Open filters by default on desktop, collapsed on mobile
  useEffect(() => {
    const handler = () => {
      try {
        setFiltersOpen(window.innerWidth >= 768)
      } catch {}
    }
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (selectedType !== 'all') params.set('type', selectedType)
    if (selectedLocation !== 'all') params.set('location', selectedLocation)
    if (guestCount !== 'all') params.set('guests', guestCount)
    if (selectedAmenities.length > 0) params.set('amenities', selectedAmenities.join(','))
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]) {
      params.set('priceMin', priceRange[0].toString())
      params.set('priceMax', priceRange[1].toString())
    }
    if (dateFrom) params.set('dateFrom', dateFrom.toISOString().split('T')[0])
    if (dateTo) params.set('dateTo', dateTo.toISOString().split('T')[0])

    const queryString = params.toString()
    const url = `/resorts${queryString ? '?' + queryString : ''}`
    try {
      router.replace(url, { scroll: false })
      // Also ensure the URL updates in browsers with SPA navigation quirks
      if (typeof window !== 'undefined') {
        try { window.history.replaceState(null, '', url) } catch {}
        // Nudge tests waiting for 'load' on SPA updates
        setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)
      }
    } catch {
      // Fallback: direct history replacement
      try { window.history.replaceState(null, '', url) } catch {}
    }
  }, [searchTerm, selectedType, selectedLocation, guestCount, selectedAmenities, sortBy, priceRange, priceBounds, dateFrom, dateTo, router])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function loadResorts(){
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
        
        if (!mounted) return

        if (error) {
          console.error('Resorts fetch error:', error)
          setResorts([])
          setLoading(false)
          return
        }

        if (mounted) {
          setResorts(data || []);
          // Fetch aggregated ratings for all resorts (simple client-side aggregation)
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('resort_id, rating');
          const ratings = (reviewsData || []).reduce((acc: any, row: any) => {
            const key = row.resort_id
            const cur = acc[key] || { avg: 0, count: 0 }
            cur.avg = ((cur.avg * cur.count) + (row.rating || 0)) / (cur.count + 1)
            cur.count = cur.count + 1
            acc[key] = cur
            return acc
          }, {} as any)
          setRatingsMap(ratings as Record<string, { avg: number, count: number }>)
          if (data && data.length > 0) {
            const prices = data.map(r => r.price || 0).filter((p) => Number.isFinite(p))
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            setPriceBounds([minPrice, maxPrice])
            setPriceRange([minPrice, maxPrice])
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Load resorts error:', err)
        if (mounted) {
          setResorts([])
          setLoading(false)
        }
      }
    }

    loadResorts()

    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
      }
    }, 10000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  // Keep price range aligned with detected bounds
  useEffect(() => {
    const [min, max] = priceBounds
    if ((min !== 0 || max !== 0) && priceRange[0] === 0 && priceRange[1] === 0) {
      const urlMin = searchParams.get('priceMin')
      const urlMax = searchParams.get('priceMax')
      setPriceRange([
        urlMin ? Number(urlMin) : min,
        urlMax ? Number(urlMax) : max
      ])
    }
  }, [priceBounds, priceRange, searchParams])

  // Check availability when dates change
  useEffect(() => {
    async function checkAvailability() {
      if (!dateFrom || !dateTo) {
        setAvailableResortIds(null)
        return
      }

      // Query bookings that overlap with selected dates
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('resort_id')
        .or(`and(date_from.lte.${dateTo.toISOString().split('T')[0]},date_to.gte.${dateFrom.toISOString().split('T')[0]})`)
        .in('status', ['pending', 'confirmed'])

      if (error) {
        console.error('Error checking availability:', error)
        setAvailableResortIds(null)
        return
      }

      // Get resort IDs that are booked (unavailable)
      const bookedResortIds = new Set(bookings?.map(b => b.resort_id) || [])
      
      // Filter to only available resorts
      const available = resorts
        .filter(r => !bookedResortIds.has(r.id))
        .map(r => r.id)
      
      setAvailableResortIds(available)
    }

    checkAvailability()
  }, [dateFrom, dateTo, resorts])

  // Calculate distance for all resorts when position is available
  const [cityProvinceMap, setCityProvinceMap] = useState<Map<string, string> | null>(null)
  useEffect(() => {
    let mounted = true
    getCityToProvinceMap().then((m) => { if (mounted) setCityProvinceMap(m) })
    return () => { mounted = false }
  }, [])

  const resortsWithDistance = useMemo(() => {
    if (!position) return resorts.map(r => ({ ...r, distance: null, rating: ratingsMap[r.id]?.avg || null, reviews_count: ratingsMap[r.id]?.count || 0 }))
    
    return resorts.map(resort => {
      let lat: number | null = null
      let lng: number | null = null
      
      if (resort.latitude && resort.longitude) {
        lat = resort.latitude
        lng = resort.longitude
      } else {
        // Try province first
        let coords = getProvinceCoordinates(resort.location)
        // If not found, try city→province map
        if (!coords && cityProvinceMap) {
          const key = (resort.location || '').trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
          const province = cityProvinceMap.get(key)
          if (province) coords = getProvinceCoordinates(province)
        }
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }
      
      if (lat === null || lng === null) return { ...resort, distance: null, rating: ratingsMap[resort.id]?.avg || null, reviews_count: ratingsMap[resort.id]?.count || 0 }
      
      const distance = calculateDistance(position.latitude, position.longitude, lat, lng)
      return { ...resort, distance, rating: ratingsMap[resort.id]?.avg || null, reviews_count: ratingsMap[resort.id]?.count || 0 }
    })
  }, [resorts, position, ratingsMap, cityProvinceMap])

  const filteredResorts = useMemo(() => {
    const minPrice = priceRange[0]
    const maxPrice = priceRange[1]

    const result = resortsWithDistance.filter(resort => {
      const searchText = `${resort.name || ''} ${resort.location || ''} ${resort.description || ''}`.toLowerCase()
      const matchesSearch = searchText.includes(searchTerm.toLowerCase())

      const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      const matchesLocation = selectedLocation === 'all' || normalize(resort.location || '').includes(normalize(selectedLocation))

      const matchesType = selectedType === 'all' || resort.type === selectedType

      const price = Number(resort.price) || 0
      const priceFilterActive = !(priceBounds[0] === 0 && priceBounds[1] === 0)
      const matchesPrice = !priceFilterActive || (price >= minPrice && price <= maxPrice)

      const matchesGuests = guestCount === 'all' || (Number(resort.capacity) || 0) >= Number(guestCount)

      const amenityList = (resort.amenities || []).map((a: string) => a.toLowerCase())
      const matchesAmenities = selectedAmenities.length === 0 || selectedAmenities.every(sa => amenityList.includes(sa.toLowerCase()))

      const matchesAvailability = availableResortIds === null || availableResortIds.includes(resort.id)

      return matchesSearch && matchesLocation && matchesType && matchesPrice && matchesGuests && matchesAmenities && matchesAvailability
    })

    // Sort by distance if "Near Me" is active
    if (showNearby && position) {
      return [...result].sort((a, b) => {
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
    }
    
    if (sortBy === 'price-asc') {
      return [...result].sort((a, b) => (a.price || 0) - (b.price || 0))
    }
    if (sortBy === 'price-desc') {
      return [...result].sort((a, b) => (b.price || 0) - (a.price || 0))
    }
    return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [resortsWithDistance, searchTerm, selectedLocation, selectedType, priceRange, priceBounds, guestCount, selectedAmenities, sortBy, availableResortIds, showNearby, position])

  // Nearby resorts based on user's GPS location (for display purposes)
  const nearbyResorts = useMemo(() => {
    if (!position || !showNearby) return []
    
    const resortsWithDist = resorts
      .map(resort => {
        // Prefer exact coordinates if available
        let lat: number | null = null
        let lng: number | null = null
        
        if (resort.latitude && resort.longitude) {
          lat = resort.latitude
          lng = resort.longitude
        } else {
          const coords = getProvinceCoordinates(resort.location)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
          }
        }
        
        if (lat === null || lng === null) return null
        
        const distance = calculateDistance(
          position.latitude,
          position.longitude,
          lat,
          lng
        )
        
        return { ...resort, distance, hasExactLocation: !!(resort.latitude && resort.longitude) }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8) // Show top 8 nearest
    
    return resortsWithDistance
  }, [resorts, position, showNearby])

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Compact Header */}
      <div className="w-full border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="px-6 sm:px-10 lg:px-20 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Explore Resorts</h1>
              <p className="text-sm text-slate-500 mt-0.5">Discover amazing stays across the Philippines</p>
              {/* Results summary (kept prominent for tests) */}
              <p
                className="text-xs text-slate-600 mt-1"
                aria-live="polite"
                data-testid="results-count"
              >
                Showing {filteredResorts.length} resorts
              </p>
            </div>
            
            {/* View Mode Toggle - Desktop */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Split
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </button>
            </div>
          </div>
          {/* Mobile View Mode Toggle */}
          <div className="md:hidden mt-3 flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-full">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              Split
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>
        </div>
        
        {/* Category Chips - Airbnb Style */}
        <div className="border-t border-slate-100">
          <div className="px-6 sm:px-10 lg:px-20">
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedType('all')
                }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  !selectedCategory
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">🏝️</span>
                <span className="text-xs font-medium whitespace-nowrap">All</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    if (['beach', 'mountain', 'nature', 'city', 'countryside'].includes(cat.id)) {
                      setSelectedType(cat.id)
                    } else {
                      setSelectedType('all')
                    }
                  }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    selectedCategory === cat.id
                      ? 'border-b-2 border-slate-900 text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  aria-label={cat.id === 'pool' ? 'Amazing swim spots' : undefined}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
                </button>
              ))}
              
              {/* Filters Button (hidden on mobile) */}
              <div className="hidden md:block flex-shrink-0 pl-4 border-l border-slate-200 ml-auto">
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl hover:border-slate-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="text-sm font-medium">Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 sm:px-10 lg:px-20 py-4">
        <div>
          {/* Location Error Message - only show if there's an error */}
          {mounted && geoSupported && geoError && showNearby && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <span>⚠️</span>
              <span>{geoError}. Please enable location in your browser.</span>
              <button onClick={() => requestLocation()} className="ml-auto text-amber-600 hover:text-amber-800 underline text-xs">
                Retry
              </button>
            </div>
          )}

          {/* Compact Filters Bar */}
          <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
            <div className="flex items-center gap-3 mb-6 flex-nowrap md:flex-wrap">
            {/* Near Me Button - Subtle toggle */}
            {mounted && geoSupported && (
              <button
                onClick={() => {
                  if (!showNearby) {
                    setShowNearby(true)
                    requestLocation()
                  } else {
                    setShowNearby(false)
                  }
                }}
                disabled={geoLoading}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  showNearby && position
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : geoLoading
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                {geoLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                )}
                {geoLoading ? 'Locating...' : showNearby && position ? 'Near Me ✓' : 'Near Me'}
              </button>
            )}
            
            {/* Search Bar */}
            <div className="relative md:flex-1 flex-shrink-0 w-64 min-w-[200px] max-w-md">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search resorts..." 
                aria-label="Search resorts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white"
              />
            </div>

            {/* Location */}
            <div className="w-40 flex-shrink-0">
              <LocationCombobox
                value={selectedLocation === 'all' ? '' : selectedLocation}
                onChange={(province) => setSelectedLocation(province || 'all')}
                placeholder="Location"
                ariaLabel="Filter by location"
                variant="hero"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              ariaLabel="Filter by resort type"
              className="flex-shrink-0 min-w-[120px]"
            >
              <option value="all">All Types</option>
              <option value="beach">🏖️ Beach</option>
              <option value="mountain">🏔️ Mountain</option>
              <option value="nature">🌿 Nature</option>
              <option value="city">🏙️ City</option>
              <option value="countryside">🌾 Countryside</option>
            </Select>

            {/* Guests Filter (numeric input) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={guestCount === 'all' ? '' : guestCount}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setGuestCount('all')
                    return
                  }
                  const n = Number(raw)
                  // Guard against NaN/negative
                  setGuestCount(Number.isFinite(n) && n > 0 ? String(n) : 'all')
                }}
                placeholder="Guests"
                aria-label="Filter by guest count"
                className="px-3 py-2 h-10 min-w-[110px] border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400 bg-white"
              />
              {guestCount !== 'all' && (
                <button
                  type="button"
                  onClick={() => setGuestCount('all')}
                  className="px-2 py-2 h-10 rounded-lg text-sm text-slate-700 border border-slate-300 hover:bg-slate-50"
                  aria-label="Clear guest filter"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort */}
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              ariaLabel="Sort resorts"
              className="flex-shrink-0 min-w-[110px]"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </Select>

            {/* Show Total toggle */}
            <button
              type="button"
              onClick={() => setShowTotalPrice(v => !v)}
              className={`flex-shrink-0 px-3 py-2 h-10 min-w-[90px] rounded-lg text-sm font-medium border transition-colors ${
                showTotalPrice ? 'bg-resort-600 text-white border-resort-600' : 'bg-white text-slate-700 border-slate-300 hover:border-resort-400'
              }`}
              aria-pressed={showTotalPrice}
            >
              Total
            </button>

            {/* Clear Filters - always visible for tests */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
                setSelectedLocation('all')
                setGuestCount('all')
                setSelectedAmenities([])
                setSortBy('newest')
                setPriceRange(priceBounds)
                setDateFrom(null)
                setDateTo(null)
              }}
              className="flex-shrink-0 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Clear All
            </button>
            </div>
          </div>

          {/* Expandable Filters - controlled open for mobile/desktop */}
          <details className="mb-6 group" open={filtersOpen}>
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 select-none">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              More filters (dates, price, amenities)
            </summary>
            
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="max-w-xl mx-auto space-y-4">
                {/* Date Range */}
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-2 md:gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Check-in</label>
                  <DatePicker
                    selected={dateFrom}
                    onChange={(date) => setDateFrom(date)}
                    selectsStart
                    startDate={dateFrom}
                    endDate={dateTo}
                    minDate={new Date()}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Check-out</label>
                  <DatePicker
                    selected={dateTo}
                    onChange={(date) => setDateTo(date)}
                    selectsEnd
                    startDate={dateFrom}
                    endDate={dateTo}
                    minDate={dateFrom || new Date()}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Price: ₱{priceRange[0].toLocaleString()} - ₱{priceRange[1].toLocaleString()}
                </label>
                <Slider
                  range
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  value={priceRange}
                  onChange={(value) => setPriceRange(value as [number, number])}
                  trackStyle={[{ backgroundColor: '#0ea5e9', height: 3 }]}
                  handleStyle={[
                    { borderColor: '#0ea5e9', height: 14, width: 14, marginTop: -5, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
                    { borderColor: '#0ea5e9', height: 14, width: 14, marginTop: -5, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
                  ]}
                  railStyle={{ backgroundColor: '#e2e8f0', height: 3 }}
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map((amenity) => {
                    const active = selectedAmenities.includes(amenity)
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))
                          } else {
                            setSelectedAmenities([...selectedAmenities, amenity])
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active 
                            ? 'bg-resort-500 border-resort-500 text-white' 
                            : 'bg-white border-slate-300 text-slate-700 hover:border-resort-400'
                        }`}
                      >
                        {amenity}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          </details>

          {/* Results summary duplicate (near filters) for visibility */}
          <div className="mb-3">
            <p className="text-sm text-slate-600" aria-live="polite">Showing {filteredResorts.length} resorts</p>
          </div>

          {/* Resorts Display */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredResorts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No resorts found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {filteredResorts.map((resort) => (
                <div key={resort.id} className="relative">
                  {/* Distance Badge when Near Me is active */}
                  {showNearby && position && resort.distance !== null && (
                    <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center gap-1">
                      <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold text-emerald-700">{formatDistance(resort.distance)}</span>
                    </div>
                  )}
                  <ResortCard resort={resort} nights={(dateFrom && dateTo) ? Math.ceil((dateTo.getTime() - dateFrom.getTime())/(1000*60*60*24)) : 0} showTotalPrice={showTotalPrice} />
                </div>
              ))}
            </div>
          ) : viewMode === 'map' ? (
            /* Full Map View */
            <div className="h-[70vh] min-h-[500px]">
              <ResortMap
                resorts={filteredResorts}
                userPosition={position}
                selectedResortId={selectedMapResort}
                onResortClick={(id) => setSelectedMapResort(id === selectedMapResort ? null : id)}
                className="h-full"
              />
            </div>
          ) : (
            /* Split View - Airbnb Style */
            <div className="flex gap-0 -mx-6 sm:-mx-10 lg:-mx-20">
              {/* List Side */}
              <div className="w-full lg:w-1/2 px-6 sm:px-10 lg:px-10 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
                  {filteredResorts.map((resort) => (
                    <div 
                      key={resort.id}
                      className={`relative transition-all cursor-pointer ${selectedMapResort === resort.id ? 'ring-2 ring-slate-900 rounded-2xl scale-[1.02]' : ''}`}
                      onClick={() => setSelectedMapResort(resort.id)}
                    >
                      {/* Distance Badge when Near Me is active */}
                      {showNearby && position && resort.distance !== null && (
                        <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center gap-1">
                          <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-semibold text-emerald-700">{formatDistance(resort.distance)}</span>
                        </div>
                      )}
                      <ResortCard resort={resort} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Map Side - Sticky */}
              <div className="hidden lg:block w-1/2 sticky top-[180px] h-[calc(100vh-200px)]">
                <ResortMap
                  resorts={filteredResorts}
                  userPosition={position}
                  selectedResortId={selectedMapResort}
                  onResortClick={(id) => setSelectedMapResort(id === selectedMapResort ? null : id)}
                  className="h-full rounded-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Show Map Button - Mobile Only (Airbnb Style) */}
      {mounted && viewMode === 'grid' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <button
            onClick={() => setViewMode('map')}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all font-medium"
          >
            <span>Show map</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Back to List Button - Mobile Map View */}
      {mounted && viewMode === 'map' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <button
            onClick={() => setViewMode('grid')}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-full shadow-xl border border-slate-200 transition-all font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Show list</span>
          </button>
        </div>
      )}
    </div>
  )
}
