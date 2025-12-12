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
import { supabase } from '../../lib/supabaseClient'



export default function ResortsPage(){
  const searchParams = useSearchParams()
  const router = useRouter()
  const typeParam = searchParams.get('type')
  
  const [resorts, setResorts] = useState<any[]>([])
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
    router.replace(`/resorts${queryString ? '?' + queryString : ''}`, { scroll: false })
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
          setResorts(data || [])
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

  const filteredResorts = useMemo(() => {
    const minPrice = priceRange[0]
    const maxPrice = priceRange[1]

    const result = resorts.filter(resort => {
      const searchText = `${resort.name || ''} ${resort.location || ''} ${resort.description || ''}`.toLowerCase()
      const matchesSearch = searchText.includes(searchTerm.toLowerCase())

      const matchesLocation = selectedLocation === 'all' || resort.location === selectedLocation

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

    if (sortBy === 'price-asc') {
      return [...result].sort((a, b) => (a.price || 0) - (b.price || 0))
    }
    if (sortBy === 'price-desc') {
      return [...result].sort((a, b) => (b.price || 0) - (a.price || 0))
    }
    return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [resorts, searchTerm, selectedLocation, selectedType, priceRange, priceBounds, guestCount, selectedAmenities, sortBy, availableResortIds])

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-br from-resort-50 via-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🏝️</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Explore Resorts</h1>
          </div>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl">Discover amazing places to stay across the Philippines</p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <div className="relative">
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search by name, location, or description" 
                  aria-label="Search resorts"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Filter by resort type"
                className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="beach">🏖️ Beach</option>
                <option value="mountain">🏔️ Mountain</option>
                <option value="nature">🌿 Nature</option>
                <option value="city">🏙️ City</option>
                <option value="countryside">🌾 Countryside</option>
              </select>
            </div>

            {/* Guests Filter */}
            <div>
              <select 
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                aria-label="Filter by guest count"
                className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              >
                <option value="all">Any guests</option>
                <option value="2">2+ guests</option>
                <option value="4">4+ guests</option>
                <option value="6">6+ guests</option>
                <option value="8">8+ guests</option>
                <option value="10">10+ guests</option>
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <LocationCombobox
                value={selectedLocation === 'all' ? '' : selectedLocation}
                onChange={(province) => setSelectedLocation(province || 'all')}
                placeholder={selectedLocation === 'all' ? 'All locations' : 'Search or pick a province'}
              />
              <p className="text-xs text-slate-500 mt-1">Search any province or clear to view all locations.</p>
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📅</span>
              <h3 className="text-lg font-bold text-slate-900">Travel Dates</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Check-in</label>
                <DatePicker
                  selected={dateFrom}
                  onChange={(date) => setDateFrom(date)}
                  selectsStart
                  startDate={dateFrom}
                  endDate={dateTo}
                  minDate={new Date()}
                  dateFormat="MMM d, yyyy"
                  placeholderText="Select check-in"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Check-out</label>
                <DatePicker
                  selected={dateTo}
                  onChange={(date) => setDateTo(date)}
                  selectsEnd
                  startDate={dateFrom}
                  endDate={dateTo}
                  minDate={dateFrom || new Date()}
                  dateFormat="MMM d, yyyy"
                  placeholderText="Select check-out"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Secondary filters */}
          <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6 items-end">
            {/* Price Range */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <span>💰</span>
                <span>Price range per night</span>
              </label>
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm">
                <Slider
                  range
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  value={priceRange}
                  onChange={(value) => setPriceRange(value as [number, number])}
                  trackStyle={[{ backgroundColor: '#0ea5e9', height: 6 }]}
                  handleStyle={[{ borderColor: '#0ea5e9', height: 20, width: 20, marginTop: -7, backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }, { borderColor: '#0ea5e9', height: 20, width: 20, marginTop: -7, backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }]}
                  railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                />
                <div className="flex justify-between mt-4 text-sm font-semibold">
                  <span className="px-3 py-1 bg-resort-100 text-resort-700 rounded-lg">₱{priceRange[0].toLocaleString()}</span>
                  <span className="px-3 py-1 bg-resort-100 text-resort-700 rounded-lg">₱{priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <span>⬆️</span>
                <span>Sort by</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort resorts"
                className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex md:justify-end lg:col-span-2">
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
                className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-xl font-semibold transition-all shadow-sm border-2 border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2"
              >
                <span>✕</span>
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✨</span>
              <h3 className="text-lg font-bold text-slate-900">Filter by Amenities</h3>
            </div>
            <div className="flex flex-wrap gap-3">
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
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all shadow-sm ${
                      active 
                        ? 'bg-gradient-to-r from-resort-500 to-blue-500 border-resort-500 text-white shadow-md scale-105' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-resort-400 hover:text-resort-600 hover:shadow-md'
                    }`}
                  >
                    {amenity}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-8">
            <p className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredResorts.length}</span> resort{filteredResorts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Resorts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredResorts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No resorts found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredResorts.map((resort) => (
                <ResortCard key={resort.id} resort={resort} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
