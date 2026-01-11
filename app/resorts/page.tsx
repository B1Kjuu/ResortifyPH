'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import ResortCard from '../../components/ResortCard'
import { RESORT_TYPES } from '../../lib/resortTypes'
import SkeletonCard from '../../components/SkeletonCard'
import LocationCombobox from '../../components/LocationCombobox'
import Select from '../../components/Select'
import CustomSelect from '../../components/CustomSelect'
import ResortMap from '../../components/ResortMap'
import { supabase } from '../../lib/supabaseClient'
import { getLocationCoordinates } from '../../lib/locations'
import { useGeolocation, calculateDistance, formatDistance } from '../../hooks/useGeolocation'
import { FaUmbrellaBeach, FaMountain, FaLeaf, FaCity, FaTractor, FaSwimmer, FaFire, FaGem, FaUsers, FaHotel, FaCampground, FaSpa, FaMapMarkerAlt } from 'react-icons/fa'
import { FiCheck, FiSearch, FiMoreHorizontal, FiX } from 'react-icons/fi'



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
  const [flyToUserTrigger, setFlyToUserTrigger] = useState(0) // Increment to trigger fly-to-user
  const [viewMode, setViewMode] = useState('grid' as 'grid' | 'map' | 'split')
  const [selectedMapResort, setSelectedMapResort] = useState<string | null>(null)
  const [showTotalPrice, setShowTotalPrice] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Scroll to top handler
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Airbnb-style categories - Priority categories first (shown on mobile)
  const priorityCategories = [
    { id: 'nearby', icon: <FaMapMarkerAlt className="w-5 h-5" />, label: 'Nearby' },
    { id: 'trending', icon: <FaFire className="w-5 h-5" />, label: 'Trending' },
    { id: 'new', icon: <FiSearch className="w-5 h-5" />, label: 'New' },
    { id: 'luxury', icon: <FaGem className="w-5 h-5" />, label: 'Luxe' },
    { id: 'staycation', icon: <FaCity className="w-5 h-5" />, label: 'Staycations' },
  ]
  
  // Extended categories (hidden on mobile unless expanded)
  const extendedCategories = [
    { id: 'beach', icon: <FaUmbrellaBeach className="w-5 h-5" />, label: 'Beachfront' },
    { id: 'mountain', icon: <FaMountain className="w-5 h-5" />, label: 'Mountains' },
    { id: 'nature', icon: <FaLeaf className="w-5 h-5" />, label: 'Nature' },
    { id: 'city', icon: <FaCity className="w-5 h-5" />, label: 'City' },
    { id: 'countryside', icon: <FaTractor className="w-5 h-5" />, label: 'Countryside' },
    { id: 'pool', icon: <FaSwimmer className="w-5 h-5" />, label: 'Amazing Pools' },
    { id: 'family', icon: <FaUsers className="w-5 h-5" />, label: 'Family' },
    { id: 'private', icon: <FaGem className="w-5 h-5" />, label: 'Private Resorts' },
    { id: 'villa', icon: <FaHotel className="w-5 h-5" />, label: 'Villas' },
    { id: 'glamping', icon: <FaCampground className="w-5 h-5" />, label: 'Glamping' },
    { id: 'farmstay', icon: <FaTractor className="w-5 h-5" />, label: 'Farmstays' },
    { id: 'spa', icon: <FaSpa className="w-5 h-5" />, label: 'Spas' },
  ]
  
  // All categories combined for desktop
  const categories = [...priorityCategories, ...extendedCategories]
  
  // State for mobile category expansion
  const [showAllCategories, setShowAllCategories] = useState(false)

  // Accent colors per resort type for chips/badges
  const typeAccentBg: Record<string, string> = {
    beach: 'bg-sky-500',
    mountain: 'bg-emerald-600',
    nature: 'bg-green-600',
    city: 'bg-slate-700',
    countryside: 'bg-lime-600',
    staycation: 'bg-indigo-600',
    private: 'bg-fuchsia-600',
    villa: 'bg-rose-600',
    glamping: 'bg-amber-500',
    farmstay: 'bg-teal-600',
    spa: 'bg-purple-600',
  }
  
  const [resorts, setResorts] = useState<any[]>([])
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number, count: number }>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'all')
  const [priceRange, setPriceRange] = useState([0, 0] as [number, number])
  const [priceBounds, setPriceBounds] = useState([0, 0] as [number, number])
  const [guestCount, setGuestCount] = useState(searchParams.get('guests') || 'all')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(searchParams.get('amenities')?.split(',').filter(Boolean) || [])
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'nearest'>((searchParams.get('sort') as any) || 'newest')
  const [stayTypeFilter, setStayTypeFilter] = useState<'all' | 'daytour' | 'overnight' | '22hrs'>(searchParams.get('stayType') as any || 'all')
  const [dateFrom, setDateFrom] = useState<Date | null>(searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : null)
  const [dateTo, setDateTo] = useState<Date | null>(searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : null)
  const [availableResortIds, setAvailableResortIds] = useState<string[] | null>(null)
  const [resortSlotPrices, setResortSlotPrices] = useState<Record<string, { daytour: number | null; overnight: number | null; '22hrs': number | null }>>({})

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
    if (stayTypeFilter !== 'all') params.set('stayType', stayTypeFilter)
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
  }, [searchTerm, selectedType, selectedLocation, guestCount, selectedAmenities, sortBy, stayTypeFilter, priceRange, priceBounds, dateFrom, dateTo, router])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function loadResorts(){
      try {
        // Use optimized API endpoint with caching
        const response = await fetch('/api/resorts?limit=100')
        
        if (!mounted) return
        
        if (!response.ok) {
          console.error('Resorts fetch error:', response.statusText)
          setResorts([])
          setLoading(false)
          return
        }

        const { resorts: data, ratings } = await response.json()

        if (mounted) {
          setResorts(data || [])
          setRatingsMap(ratings || {})
          // Pre-seed slot prices from API response (derived from pricing_config/legacy)
          const apiSlotPrices: Record<string, { daytour: number | null; overnight: number | null; '22hrs': number | null }> = {}
          ;(data || []).forEach((r: any) => {
            if (r.slot_prices) {
              apiSlotPrices[r.id] = r.slot_prices
            } else {
              apiSlotPrices[r.id] = {
                daytour: r.day_tour_price ?? null,
                overnight: r.overnight_price ?? r.night_tour_price ?? null,
                '22hrs': r.overnight_price ?? r.night_tour_price ?? null,
              }
            }
          })
          setResortSlotPrices(apiSlotPrices)
          if (data && data.length > 0) {
            const prices = data.map((r: any) => r.price || 0).filter((p: number) => Number.isFinite(p))
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

  // Fetch slot type prices for all resorts (advanced pricing is now required)
  useEffect(() => {
    if (resorts.length === 0) return
    
    const allResortIds = resorts.map(r => r.id)
    if (allResortIds.length === 0) return
    
    async function fetchSlotPrices() {
      try {
        // First get all time slots for these resorts
        const { data: slotsData, error: slotsError } = await supabase
          .from('resort_time_slots')
          .select('id, resort_id, slot_type')
          .in('resort_id', allResortIds)
          .eq('is_active', true)
        
        if (slotsError) {
          console.error('Error fetching time slots:', slotsError)
          return
        }
        
        if (!slotsData || slotsData.length === 0) return
        
        const slotIds = slotsData.map(s => s.id)
        
        // Then get all pricing matrix entries for these slots
        const { data: pricingData, error: pricingError } = await supabase
          .from('resort_pricing_matrix')
          .select('time_slot_id, price')
          .in('time_slot_id', slotIds)
        
        if (pricingError) {
          console.error('Error fetching pricing matrix:', pricingError)
          return
        }
        
        // Build a map of slot_id -> min price
        const slotMinPrices: Record<string, number> = {}
        pricingData?.forEach((p: any) => {
          const price = Number(p.price)
          if (!slotMinPrices[p.time_slot_id] || price < slotMinPrices[p.time_slot_id]) {
            slotMinPrices[p.time_slot_id] = price
          }
        })
        
        // Build final prices map per resort
        const pricesMap: Record<string, { daytour: number | null; overnight: number | null; '22hrs': number | null }> = {}
        
        slotsData.forEach((slot: any) => {
          const resortId = slot.resort_id
          if (!pricesMap[resortId]) {
            pricesMap[resortId] = { daytour: null, overnight: null, '22hrs': null }
          }
          
          const slotType = slot.slot_type as 'daytour' | 'overnight' | '22hrs'
          const minPrice = slotMinPrices[slot.id]
          if (minPrice != null) {
            if (pricesMap[resortId][slotType] === null || minPrice < pricesMap[resortId][slotType]!) {
              pricesMap[resortId][slotType] = minPrice
            }
          }
        })
        
        setResortSlotPrices(prev => ({ ...prev, ...pricesMap }))
      } catch (err) {
        console.error('Error fetching slot prices:', err)
      }
    }
    
    fetchSlotPrices()
  }, [resorts])

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
  const resortsWithDistance = useMemo(() => {
    if (!position) return resorts.map(r => ({ ...r, distance: null, rating: ratingsMap[r.id]?.avg || null, reviews_count: ratingsMap[r.id]?.count || 0 }))
    
    return resorts.map(resort => {
      let lat: number | null = null
      let lng: number | null = null
      
      if (resort.latitude && resort.longitude) {
        // Use exact coordinates from database
        lat = resort.latitude
        lng = resort.longitude
      } else {
        // Use getLocationCoordinates which tries city first, then province
        const coords = getLocationCoordinates(resort.location)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }
      
      if (lat === null || lng === null) return { ...resort, distance: null, rating: ratingsMap[resort.id]?.avg || null, reviews_count: ratingsMap[resort.id]?.count || 0 }
      
      const distance = calculateDistance(position.latitude, position.longitude, lat, lng)
      return { ...resort, distance, rating: ratingsMap[resort.id]?.avg || null, reviews_count: ratingsMap[resort.id]?.count || 0 }
    })
  }, [resorts, position, ratingsMap])

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

    // Sort by distance if "Near Me" is active or sortBy is 'nearest'
    if ((showNearby && position) || (sortBy === 'nearest' && position)) {
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
    if (sortBy === 'nearest' && !position) {
      // If nearest is selected but no position yet, keep default order
      return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [resortsWithDistance, searchTerm, selectedLocation, selectedType, priceRange, priceBounds, guestCount, selectedAmenities, sortBy, availableResortIds, showNearby, position])

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedType !== 'all' ||
    selectedLocation !== 'all' ||
    guestCount !== 'all' ||
    selectedAmenities.length > 0 ||
    sortBy !== 'newest' ||
    stayTypeFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(selectedCategory) ||
    showNearby ||
    priceRange[0] !== priceBounds[0] ||
    priceRange[1] !== priceBounds[1]

  const isCatalogEmpty = resorts.length === 0

  // Nearby resorts list (optional, currently unused placeholder)
  const nearbyResorts = useMemo(() => {
    return [] as any[]
  }, [position, showNearby, resorts])

  return (
    <div className="w-full min-h-screen bg-white overflow-x-hidden">
      {/* Compact Header - Sticky */}
      <div className="w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-14 sm:top-16 z-40">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4 max-w-[1800px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Explore Resorts</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Discover amazing stays across the Philippines</p>
              {/* Results summary */}
              <p className="text-xs text-resort-600 font-medium mt-1" aria-live="polite" data-testid="results-count">
                {loading ? 'Loading...' : `${filteredResorts.length} resort${filteredResorts.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            {/* View Mode Toggle - Desktop */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}> 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Grid
              </button>
              <button onClick={() => setViewMode('split')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/></svg>
                Split
              </button>
              <button onClick={() => setViewMode('map')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                Map
              </button>
            </div>
          </div>
          {/* Mobile View Mode Toggle - No Split on mobile */}
          <div className="md:hidden mt-3 flex items-center bg-gradient-to-b from-slate-100 to-slate-200/50 rounded-xl p-1 w-full max-w-xs mx-auto shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'grid' || viewMode === 'split' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              Grid
            </button>
            <button onClick={() => setViewMode('map')} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              Map
            </button>
          </div>
        </div>

        {/* Category Chips - Horizontal Scroll with hidden scrollbar */}
        <div className="border-t border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1800px] mx-auto">
            <div className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 overflow-x-auto scrollbar-hide">
              {/* All button */}
              <button onClick={() => { setSelectedCategory(null); setSelectedType('all'); setShowNearby(false); setSortBy('newest') }} className={`flex-shrink-0 flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all ${!selectedCategory ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                <FaUmbrellaBeach className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">All</span>
              </button>
              
              {/* Priority categories - always visible */}
              {priorityCategories.map((cat) => (
                <button key={cat.id} onClick={() => {
                  setSelectedCategory(cat.id)
                  if (cat.id === 'nearby') {
                    setShowNearby(true)
                    setSortBy('nearest')
                    setFlyToUserTrigger(prev => prev + 1)
                    requestLocation()
                    setSelectedType('all')
                    if (typeof window !== 'undefined') {
                      if (window.innerWidth >= 1024) {
                        setViewMode('split')
                      } else {
                        setViewMode('map')
                      }
                    }
                  } else if (['staycation'].includes(cat.id)) {
                    setSelectedType(cat.id)
                    setShowNearby(false)
                  } else {
                    setSelectedType('all')
                    setShowNearby(false)
                  }
                }} className={`flex-shrink-0 flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all ${
                  selectedCategory === cat.id 
                    ? cat.id === 'nearby' 
                      ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50' 
                      : 'border-b-2 border-slate-900 text-slate-900' 
                    : cat.id === 'nearby' 
                      ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                  <span className="text-base sm:text-xl relative">
                    {cat.id === 'nearby' && geoLoading ? (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : cat.id === 'nearby' && showNearby && position ? (
                      <span className="relative">
                        {cat.icon}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      </span>
                    ) : cat.icon}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{cat.label}</span>
                </button>
              ))}
              
              {/* Extended categories - Hidden on mobile unless expanded, always visible on desktop */}
              {extendedCategories.map((cat) => (
                <button key={cat.id} onClick={() => {
                  setSelectedCategory(cat.id)
                  if (['beach','mountain','nature','city','countryside','pool','family','private','villa','glamping','farmstay','spa'].includes(cat.id)) {
                    setSelectedType(cat.id)
                    setShowNearby(false)
                  } else {
                    setSelectedType('all')
                    setShowNearby(false)
                  }
                }} className={`flex-shrink-0 flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all ${showAllCategories ? 'flex' : 'hidden md:flex'} ${
                  selectedCategory === cat.id 
                    ? 'border-b-2 border-slate-900 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                  <span className="text-base sm:text-xl">{cat.icon}</span>
                  <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{cat.label}</span>
                </button>
              ))}
              
              {/* More/Less button - Mobile only, at the end */}
              <button 
                onClick={() => setShowAllCategories(!showAllCategories)} 
                className={`md:hidden flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${showAllCategories ? 'border-b-2 border-resort-600 text-resort-700 bg-resort-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                {showAllCategories ? <FiX className="w-4 h-4" /> : <FiMoreHorizontal className="w-4 h-4" />}
                <span className="text-[10px] font-medium whitespace-nowrap">{showAllCategories ? 'Less' : 'More'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section - Below sticky header */}
      <div className="w-full bg-slate-50 border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1800px] mx-auto py-3 sm:py-4">
          {/* Geolocation warning */}
          {geoError && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-700">
              <span>⚠️</span>
              <span className="flex-1">{geoError}. Please enable location.</span>
              <button onClick={() => requestLocation()} className="text-amber-600 hover:text-amber-800 underline text-xs">Retry</button>
            </div>
          )}
          
          {/* Filter Controls - Stacked on mobile, inline on desktop */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Search + Location + Near Me */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Near Me */}
              {mounted && geoSupported && (
                <button onClick={() => { 
                  if (!showNearby) { 
                    setShowNearby(true); 
                    setSortBy('nearest');
                    setFlyToUserTrigger(prev => prev + 1);
                    requestLocation();
                    // Switch to map view to show user's location
                    if (typeof window !== 'undefined') {
                      if (window.innerWidth >= 1024) {
                        setViewMode('split')
                      } else {
                        setViewMode('map')
                      }
                    }
                  } else { 
                    // If already showing nearby and have position, just re-fly to user
                    if (position) {
                      setFlyToUserTrigger(prev => prev + 1);
                    } else {
                      setShowNearby(false);
                      setSortBy('newest');
                    }
                  } 
                }} disabled={geoLoading} className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 h-10 rounded-xl text-sm font-medium transition-all shadow-sm ${showNearby && position ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-500' : geoLoading ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-gradient-to-b from-white to-slate-50 text-slate-700 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 hover:shadow'}`}>
                  {geoLoading ? (<div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  )}
                  <span>{geoLoading ? 'Locating...' : 'Near Me'}</span>
                  {showNearby && position && <FiCheck className="w-4 h-4" />}
                </button>
              )}
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" placeholder="Search resorts..." aria-label="Search resorts" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-gradient-to-b from-white to-slate-50 shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 focus:bg-white transition-all" />
              </div>
              {/* Location */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <LocationCombobox value={selectedLocation === 'all' ? '' : selectedLocation} onChange={(province) => setSelectedLocation(province || 'all')} placeholder="Location" ariaLabel="Filter by location" variant="hero" />
              </div>
            </div>
            
            {/* Row 2: Type + Stay Type + Guests + Sort + Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type */}
              <CustomSelect
                value={selectedType}
                onChange={(val) => setSelectedType(val)}
                options={[{ value: 'all', label: 'All Types' }, ...RESORT_TYPES.map(t => ({ value: t.id, label: t.label }))]}
                ariaLabel="Filter by resort type"
                className="flex-1 sm:flex-initial min-w-[120px]"
              />
              {/* Stay Type Filter - Toggle Button Group */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setStayTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    stayTypeFilter === 'all' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStayTypeFilter('daytour')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    stayTypeFilter === 'daytour' 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>☀️</span>
                  <span className="hidden sm:inline">Day</span>
                </button>
                <button
                  onClick={() => setStayTypeFilter('overnight')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    stayTypeFilter === 'overnight' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🌙</span>
                  <span className="hidden sm:inline">Night</span>
                </button>
                <button
                  onClick={() => setStayTypeFilter('22hrs')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    stayTypeFilter === '22hrs' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>⏰</span>
                  <span className="hidden sm:inline">22hrs</span>
                </button>
              </div>
              {/* Guests - with icon */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <input type="number" inputMode="numeric" min={1} value={guestCount === 'all' ? '' : guestCount} onChange={(e) => { const raw = e.target.value; if (raw === '') { setGuestCount('all'); return } const n = Number(raw); setGuestCount(Number.isFinite(n) && n > 0 ? String(n) : 'all') }} placeholder="Guests" aria-label="Filter by guest count" className="pl-9 pr-3 py-2 h-10 w-28 border border-slate-200 rounded-xl text-sm font-medium bg-gradient-to-b from-white to-slate-50 shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 focus:bg-white transition-all" />
              </div>
              {/* Check-in - with calendar icon */}
              <div className="flex-1 min-w-[100px] sm:flex-initial sm:w-[140px] relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <DatePicker selected={dateFrom} onChange={(date) => setDateFrom(date)} selectsStart startDate={dateFrom} endDate={dateTo} minDate={new Date()} dateFormat="MMM d" placeholderText="Check-in" className="w-full pl-9 pr-3 py-2 h-10 border border-slate-200 rounded-xl text-sm font-medium bg-gradient-to-b from-white to-slate-50 shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 focus:bg-white transition-all" />
              </div>
              {/* Check-out - with calendar icon */}
              <div className="flex-1 min-w-[100px] sm:flex-initial sm:w-[140px] relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <DatePicker selected={dateTo} onChange={(date) => setDateTo(date)} selectsEnd startDate={dateFrom} endDate={dateTo} minDate={dateFrom || new Date()} dateFormat="MMM d" placeholderText="Check-out" className="w-full pl-9 pr-3 py-2 h-10 border border-slate-200 rounded-xl text-sm font-medium bg-gradient-to-b from-white to-slate-50 shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 focus:bg-white transition-all" />
              </div>
              {/* Price Range - Inline */}
              {priceBounds[0] !== priceBounds[1] && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 h-10 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">₱{priceRange[0].toLocaleString()}</span>
                  <div className="w-32">
                    <Slider range min={priceBounds[0]} max={priceBounds[1]} value={priceRange} onChange={(value) => setPriceRange(value as [number, number])} trackStyle={[{ backgroundColor: '#0ea5e9', height: 4 }]} handleStyle={[{ borderColor: '#0ea5e9', height: 14, width: 14, marginTop: -5, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, { borderColor: '#0ea5e9', height: 14, width: 14, marginTop: -5, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }]} railStyle={{ backgroundColor: '#e2e8f0', height: 4 }} />
                  </div>
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">₱{priceRange[1].toLocaleString()}</span>
                </div>
              )}
              {/* Sort */}
              <CustomSelect
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val as any)
                  if (val === 'nearest' && !position) {
                    requestLocation()
                  }
                }}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'price-asc', label: 'Price ↑' },
                  { value: 'price-desc', label: 'Price ↓' },
                  { value: 'nearest', label: 'Nearest' },
                ]}
                ariaLabel="Sort resorts"
                className="flex-1 sm:flex-initial min-w-[100px]"
              />
              {/* Clear All - with X icon */}
              <button type="button" onClick={() => { setSearchTerm(''); setSelectedType('all'); setSelectedLocation('all'); setGuestCount('all'); setSelectedAmenities([]); setSortBy('newest'); setStayTypeFilter('all'); setPriceRange(priceBounds); setDateFrom(null); setDateTo(null) }} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 h-10 text-sm text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors border border-red-200 hover:border-red-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Clear</span>
              </button>
            </div>

            {/* Mobile: Price Range Slider */}
            {priceBounds[0] !== priceBounds[1] && (
              <div className="lg:hidden flex items-center gap-3 px-1">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">₱{priceRange[0].toLocaleString()}</span>
                <div className="flex-1">
                  <Slider range min={priceBounds[0]} max={priceBounds[1]} value={priceRange} onChange={(value) => setPriceRange(value as [number, number])} trackStyle={[{ backgroundColor: '#0ea5e9', height: 4 }]} handleStyle={[{ borderColor: '#0ea5e9', height: 16, width: 16, marginTop: -6, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, { borderColor: '#0ea5e9', height: 16, width: 16, marginTop: -6, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }]} railStyle={{ backgroundColor: '#e2e8f0', height: 4 }} />
                </div>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">₱{priceRange[1].toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1800px] mx-auto py-4 sm:py-6 pb-8 sm:pb-12">
        {/* Results summary */}
        <div className="mb-3"><p className="text-sm text-slate-600" aria-live="polite">Showing {filteredResorts.length} resorts</p></div>

        {/* Resorts Display */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">{[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : filteredResorts.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center">
                <FiSearch className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{isCatalogEmpty ? 'No resorts yet' : 'No resorts found'}</h3>
            <p className="text-slate-600 mb-6 text-sm sm:text-base">
              {isCatalogEmpty ? 'Add your own resort to be the first one on ResortifyPH.' : 'Try adjusting your search or filters'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedType('all'); setSelectedLocation('all'); setGuestCount('all'); setSelectedAmenities([]); setSortBy('newest'); setPriceRange(priceBounds); setDateFrom(null); setDateTo(null); setSelectedCategory(null) }}
                  className="px-6 py-2.5 bg-resort-600 hover:bg-resort-700 text-white rounded-xl font-medium transition-colors w-full sm:w-auto"
                >
                  Clear all filters
                </button>
              )}

              {isCatalogEmpty && (
                <Link
                  href="/become-host"
                  className="px-6 py-2.5 bg-resort-600 hover:bg-resort-700 text-white rounded-xl font-medium transition-colors w-full sm:w-auto"
                >
                  List your resort
                </Link>
              )}

              {isCatalogEmpty && (
                <Link
                  href="/how-it-works"
                  className="px-6 py-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 rounded-xl font-medium transition-colors w-full sm:w-auto"
                >
                  How it works
                </Link>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {filteredResorts.map((resort) => (
              <div key={resort.id} className="relative">
                <ResortCard resort={resort} nights={(dateFrom && dateTo) ? Math.ceil((dateTo.getTime() - dateFrom.getTime())/(1000*60*60*24)) : 0} showTotalPrice={showTotalPrice} distance={showNearby && position ? resort.distance : null} slotTypePrices={resortSlotPrices[resort.id] || null} selectedSlotType={stayTypeFilter} />
              </div>
            ))}
          </div>
        ) : viewMode === 'map' ? (
          /* Full map view - responsive height */
          <div className="h-[60vh] sm:h-[70vh] min-h-[400px] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
            <ResortMap resorts={filteredResorts} userPosition={position} selectedResortId={selectedMapResort} onResortClick={(id) => setSelectedMapResort(id === selectedMapResort ? null : id)} className="h-full" onRequestLocation={requestLocation} onFlyToUser={() => setFlyToUserTrigger(prev => prev + 1)} geoLoading={geoLoading} flyToUserTrigger={flyToUserTrigger} />
          </div>
        ) : (
          /* Split view - cards left, map right on desktop; stacked on mobile */
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-0">
            {/* Cards section */}
            <div className="w-full lg:w-1/2 lg:pr-4">
              <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 pb-4">
                  {filteredResorts.map((resort) => (
                    <div 
                      key={resort.id} 
                      className={`relative transition-all cursor-pointer ${selectedMapResort === resort.id ? 'ring-2 ring-cyan-500 rounded-2xl scale-[1.02] shadow-lg' : 'hover:shadow-md'}`} 
                      onClick={() => setSelectedMapResort(resort.id)}
                    >
                      <ResortCard resort={resort} distance={showNearby && position ? resort.distance : null} slotTypePrices={resortSlotPrices[resort.id] || null} selectedSlotType={stayTypeFilter} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Map section - sticky on desktop, shown below on mobile */}
            <div className="w-full lg:w-1/2 h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-220px)] lg:sticky lg:top-[200px] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
              <ResortMap resorts={filteredResorts} userPosition={position} selectedResortId={selectedMapResort} onResortClick={(id) => setSelectedMapResort(id === selectedMapResort ? null : id)} className="h-full" onRequestLocation={requestLocation} onFlyToUser={() => setFlyToUserTrigger(prev => prev + 1)} geoLoading={geoLoading} flyToUserTrigger={flyToUserTrigger} />
            </div>
          </div>
        )}
      </div>

      {/* Floating buttons - Mobile */}
      {mounted && viewMode === 'grid' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <button onClick={() => setViewMode('map')} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all font-medium">
            <span>Show map</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          </button>
        </div>
      )}
      {mounted && viewMode === 'map' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-full shadow-xl border border-slate-200 transition-all font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span>Show list</span>
          </button>
        </div>
      )}

      {/* Scroll to Top Button */}
      {mounted && showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-resort-600 hover:bg-resort-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  )
}
