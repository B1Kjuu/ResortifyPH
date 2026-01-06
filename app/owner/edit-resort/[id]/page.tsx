'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUploader from '../../../../components/ImageUploader'
import LocationCombobox from '../../../../components/LocationCombobox'
import LocationPicker from '../../../../components/LocationPicker'
import Select from '../../../../components/Select'
import TimePicker from '../../../../components/TimePicker'
import DisclaimerBanner from '../../../../components/DisclaimerBanner'
import PricingConfigurator from '../../../../components/PricingConfigurator'
import { getProvinceInfo } from '../../../../lib/locations'
import { supabase } from '../../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { FiMapPin, FiDollarSign, FiUsers, FiCamera, FiCheck, FiClock, FiSave, FiTrash2, FiEdit } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { FaUmbrellaBeach, FaMountain, FaLeaf, FaCity, FaTractor } from 'react-icons/fa'
import { RESORT_TYPES } from '../../../../lib/resortTypes'
import { ResortPricingConfig } from '../../../../lib/validations'

export default function EditResort(){
  const params = useParams()
  const resortId = params?.id as string
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('city')
  const [price, setPrice] = useState<number | ''>('')
  const [dayTourPrice, setDayTourPrice] = useState<number | ''>('')
  const [nightTourPrice, setNightTourPrice] = useState<number | ''>('')
  const [overnightPrice, setOvernightPrice] = useState<number | ''>('')
  const [additionalGuestFee, setAdditionalGuestFee] = useState<number | ''>('')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [bedrooms, setBedrooms] = useState<number | ''>('')
  const [bathrooms, setBathrooms] = useState<number | ''>('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [contactNumber, setContactNumber] = useState('')
  const [checkInTime, setCheckInTime] = useState('14:00')
  const [checkOutTime, setCheckOutTime] = useState('12:00')
  const [houseRules, setHouseRules] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible')
  const [poolSize, setPoolSize] = useState('')
  const [poolDepth, setPoolDepth] = useState('')
  const [hasPoolHeating, setHasPoolHeating] = useState(false)
  const [hasJacuzzi, setHasJacuzzi] = useState(false)
  const [parkingSlots, setParkingSlots] = useState<number | ''>('')
  const [nearbyLandmarks, setNearbyLandmarks] = useState('')
  const [bringOwnItems, setBringOwnItems] = useState('')
  const [pricingConfig, setPricingConfig] = useState<ResortPricingConfig | null>(null)
  const [pricingMode, setPricingMode] = useState<'simple' | 'advanced'>('advanced')
  // Exact location fields
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadResort(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/login')
        setLoading(false)
        return
      }

      // Check if user is owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profile?.role !== 'owner') {
        router.push('/owner/dashboard')
        setLoading(false)
        return
      }

      // First-login email gate
      if (!profile?.email) {
        router.push('/profile?requireEmail=1')
        setLoading(false)
        return
      }

      // Load resort data
      const { data: resort, error } = await supabase
        .from('resorts')
        .select('*')
        .eq('id', resortId)
        .eq('owner_id', session.user.id)
        .single()

      if (error || !resort) {
        alert('Resort not found or unauthorized')
        router.push('/owner/my-resorts')
        return
      }

      // Populate form with existing data
      setName(resort.name || '')
      setDescription(resort.description || '')
      setLocation(resort.location || '')
      setType(resort.type || 'city')
      setPrice(resort.price || '')
      setDayTourPrice(resort.day_tour_price || '')
      setNightTourPrice(resort.night_tour_price || '')
      setOvernightPrice(resort.overnight_price || '')
      setAdditionalGuestFee(resort.additional_guest_fee || '')
      setCapacity(resort.capacity || '')
      setBedrooms(resort.bedrooms || '')
      setBathrooms(resort.bathrooms || '')
      setAmenities(resort.amenities || [])
      setImages(resort.images || [])
      setContactNumber(resort.contact_number || '')
      setCheckInTime(resort.check_in_time || '14:00')
      setCheckOutTime(resort.check_out_time || '12:00')
      setHouseRules(resort.house_rules || '')
      setCancellationPolicy(resort.cancellation_policy || 'flexible')
      setPoolSize(resort.pool_size || '')
      setPoolDepth(resort.pool_depth || '')
      setHasPoolHeating(resort.has_pool_heating || false)
      setHasJacuzzi(resort.has_jacuzzi || false)
      setParkingSlots(resort.parking_slots || '')
      setNearbyLandmarks(resort.nearby_landmarks || '')
      setBringOwnItems(resort.bring_own_items || '')
      setPricingConfig(resort.pricing_config || null)
      // Use use_advanced_pricing flag if set, otherwise check if pricing_config exists
      setPricingMode(resort.use_advanced_pricing || resort.pricing_config ? 'advanced' : 'simple')
      // Load exact location data
      setLatitude(resort.latitude || null)
      setLongitude(resort.longitude || null)
      setAddress(resort.address || '')
      
      setUserId(session.user.id)
      setIsAuthorized(true)
      setLoading(false)
    }
    
    if (resortId) {
      loadResort()
    }
  }, [resortId, router])

  async function handleUpdate(e: React.FormEvent){
    e.preventDefault()
    // For advanced pricing, base price is optional (comes from pricing config)
    const isAdvancedPricing = pricingMode === 'advanced' && pricingConfig?.pricing?.length
    if (!userId || !name || !location || !capacity || !contactNumber) { 
      alert('Please fill all required fields'); 
      return 
    }
    // Require price only for simple pricing mode
    if (!isAdvancedPricing && !price) {
      alert('Please set a base price'); 
      return 
    }
    if (images.length === 0) {
      alert('At least 1 image is required');
      return
    }
    
    setSubmitting(true)
    const provinceInfo = getProvinceInfo(location)

    const { error } = await supabase
      .from('resorts')
      .update({ 
        name, 
        description, 
        location, 
        latitude,
        longitude,
        address,
        region_code: provinceInfo?.regionCode ?? null,
        region_name: provinceInfo?.regionName ?? null,
        type,
        price: price ? Number(price) : null,
        day_tour_price: dayTourPrice ? Number(dayTourPrice) : null,
        night_tour_price: nightTourPrice ? Number(nightTourPrice) : null,
        overnight_price: overnightPrice ? Number(overnightPrice) : null,
        additional_guest_fee: additionalGuestFee ? Number(additionalGuestFee) : null,
        capacity: Number(capacity),
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        amenities, 
        images, 
        contact_number: contactNumber,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        house_rules: houseRules,
        cancellation_policy: cancellationPolicy,
        pool_size: poolSize,
        pool_depth: poolDepth,
        has_pool_heating: hasPoolHeating,
        has_jacuzzi: hasJacuzzi,
        parking_slots: parkingSlots ? Number(parkingSlots) : null,
        nearby_landmarks: nearbyLandmarks,
        bring_own_items: bringOwnItems,
        pricing_config: pricingMode === 'advanced' ? pricingConfig : null,
        use_advanced_pricing: pricingMode === 'advanced' && pricingConfig?.pricing?.length ? true : false,
        updated_at: new Date() 
      })
      .eq('id', resortId)
      .eq('owner_id', userId)
    
    if (error) { 
      toast.error('Error: ' + error.message)
      setSubmitting(false)
      return 
    }
    
    toast.success('Resort updated successfully!')
    router.push('/owner/my-resorts')
  }

  async function handleDelete(){
    if (!confirm('Are you sure you want to delete this resort? This action cannot be undone.')) {
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('resorts')
      .delete()
      .eq('id', resortId)
      .eq('owner_id', userId)

    if (error) {
      toast.error('Error deleting resort: ' + error.message)
      setSubmitting(false)
      return
    }

    toast.success('Resort deleted successfully')
    router.push('/owner/my-resorts')
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>
  if (!isAuthorized) return null

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
        <Link href="/owner/my-resorts" className="inline-flex items-center gap-2 text-resort-600 hover:text-resort-700 font-semibold mb-6 transition-colors">
          <span>←</span>
          <span>Back to My Resorts</span>
        </Link>
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <FiEdit className="w-8 h-8 text-slate-700" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Edit Resort</h1>
          </div>
          <p className="text-lg text-slate-600 pl-14">Update your resort details and information.</p>
          <div className="mt-4 pl-14">
            <DisclaimerBanner title="Owner Payment Notice">
              ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
            </DisclaimerBanner>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Resort Name *</label>
          <input 
            type="text"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
            placeholder="e.g., Paradise Beach Resort" 
            value={name} 
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> Province/City *</label>
          <LocationCombobox
            value={location}
            onChange={setLocation}
            placeholder="Search or pick a province"
          />
        </div>

        {/* Exact Location Map Picker */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiMapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pin Your Exact Location</h3>
              <p className="text-sm text-slate-600">Help guests find your resort easily on the map</p>
            </div>
          </div>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            address={address}
            onLocationChange={(lat, lng) => {
              setLatitude(lat)
              setLongitude(lng)
            }}
            onAddressChange={(addr) => {
              setAddress(addr)
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Resort Type *</label>
          <Select
            ariaLabel="Resort type"
            className="w-full"
            value={type}
            onChange={e => setType(e.target.value)}
            required
          >
            {RESORT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        </div>

        {/* Pricing Mode Toggle */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiDollarSign className="w-5 h-5 text-slate-700" />
            <label className="text-sm font-bold text-slate-700">Pricing Mode</label>
          </div>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPricingMode('simple')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                pricingMode === 'simple'
                  ? 'bg-resort-500 text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-resort-300'
              }`}
            >
              Simple Pricing
            </button>
            <button
              type="button"
              onClick={() => setPricingMode('advanced')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                pricingMode === 'advanced'
                  ? 'bg-resort-500 text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-resort-300'
              }`}
            >
              Advanced Pricing
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {pricingMode === 'simple'
              ? 'Set pricing for different stay types.'
              : 'Configure tiered pricing with daytour, overnight, and 22-hour options, plus weekday/weekend rates.'}
          </p>
        </div>

        {/* Simple Pricing Mode */}
        {pricingMode === 'simple' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Base Price per Night (₱) *</label>
            <input 
              type="number"
              min={0}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 5000" 
              value={price as any} 
              onChange={e => setPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              required={pricingMode === 'simple'}
            />
            <p className="text-xs text-slate-500 mt-1">Default price if specific types are not set</p>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Day Tour Price (₱)</label>
            <input 
              type="number"
              min={0}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 4000" 
              value={dayTourPrice as any} 
              onChange={e => setDayTourPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to use base price</p>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Night Tour Price (₱)</label>
            <input 
              type="number"
              min={0}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 5000" 
              value={nightTourPrice as any} 
              onChange={e => setNightTourPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to use base price</p>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Overnight/22hrs Price (₱)</label>
            <input 
              type="number"
              min={0}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 7000" 
              value={overnightPrice as any} 
              onChange={e => setOvernightPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to use base price</p>
          </div>
        </div>
        )}

        {/* Advanced Pricing Mode */}
        {pricingMode === 'advanced' && (
          <div className="space-y-4">
            <Link
              href={`/owner/pricing-settings/${resortId}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-semibold hover:from-resort-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
            >
              <FiDollarSign className="w-5 h-5" />
              Open Advanced Pricing Settings
              <span className="text-sm opacity-80">(Time Slots, Guest Tiers, Pricing Matrix)</span>
            </Link>
            <p className="text-sm text-center text-slate-500">
              Configure custom time slots, guest tiers, and set prices for each combination.
            </p>
            <PricingConfigurator
              value={pricingConfig}
              onChange={setPricingConfig}
              capacity={typeof capacity === 'number' ? capacity : undefined}
            />
          </div>
        )}

        {/* Guest Capacity (shown in both modes) */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiUsers className="w-4 h-4" /> Guest Capacity *</label>
            <input 
              type="number"
              min={1}
              max={150}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 10" 
              value={capacity as any} 
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              onInput={(e) => {
                const input = e.target as HTMLInputElement
                input.value = input.value.replace(/[^0-9]/g, '').replace(/^0+/, '') || ''
              }}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bedrooms</label>
            <input 
              type="number"
              min={0}
              max={50}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 3" 
              value={bedrooms as any} 
              onChange={e => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
              onInput={(e) => {
                const input = e.target as HTMLInputElement
                input.value = input.value.replace(/[^0-9]/g, '') || ''
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bathrooms</label>
            <input 
              type="number"
              min={0}
              max={50}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 2" 
              value={bathrooms as any} 
              onChange={e => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
              onInput={(e) => {
                const input = e.target as HTMLInputElement
                input.value = input.value.replace(/[^0-9]/g, '') || ''
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number *</label>
          <input 
            type="tel"
            inputMode="numeric"
            maxLength={13}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
            placeholder="e.g., 09171234567" 
            value={contactNumber} 
            onChange={e => setContactNumber(e.target.value)}
            onInput={(e) => {
              const input = e.target as HTMLInputElement
              input.value = input.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
            }}
            required
          />
          <p className="text-xs text-slate-500 mt-1">Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaStar className="w-5 h-5 text-slate-700" />
              <label className="text-sm font-bold text-slate-700">Amenities</label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmenities(['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen', 'BBQ Grill', 'Videoke', 'Netflix', 'Billiards', 'Game Room', 'Outdoor Seating'])}
                className="px-3 py-1.5 text-xs font-medium bg-resort-100 text-resort-700 rounded-lg hover:bg-resort-200 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setAmenities([])}
                className="px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen', 'BBQ Grill', 'Videoke', 'Netflix', 'Billiards', 'Game Room', 'Outdoor Seating'].map(amenity => (
              <label key={amenity} className="flex items-center gap-2 sm:gap-3 cursor-pointer bg-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-slate-200 hover:border-resort-400 transition-colors">
                <input
                  type="checkbox"
                  checked={amenities.includes(amenity)}
                  onChange={e => {
                    if (e.target.checked) {
                      setAmenities([...amenities, amenity])
                    } else {
                      setAmenities(amenities.filter(a => a !== amenity))
                    }
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-resort-500 border-slate-300 rounded focus:ring-2 focus:ring-resort-400 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm font-medium text-slate-700 break-words">{amenity}</span>
              </label>
            ))}
          </div>
          
          {/* Custom amenities display */}
          {amenities.filter(a => !['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen', 'BBQ Grill', 'Videoke', 'Netflix', 'Billiards', 'Game Room', 'Outdoor Seating'].includes(a)).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Custom Amenities:</p>
              <div className="flex flex-wrap gap-2">
                {amenities.filter(a => !['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen', 'BBQ Grill', 'Videoke', 'Netflix', 'Billiards', 'Game Room', 'Outdoor Seating'].includes(a)).map(customAmenity => (
                  <span 
                    key={customAmenity}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-resort-100 text-resort-700 rounded-full text-sm font-medium"
                  >
                    {customAmenity}
                    <button
                      type="button"
                      onClick={() => setAmenities(amenities.filter(a => a !== customAmenity))}
                      className="ml-1 text-resort-500 hover:text-resort-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Add custom amenity input */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Add Custom Amenity:</label>
            <div className="flex gap-2">
              <input
                type="text"
                id="custom-amenity-input-edit"
                placeholder="e.g., Hammock, Fire Pit, Telescope..."
                className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const input = e.target as HTMLInputElement
                    const value = input.value.trim()
                    if (value && !amenities.includes(value)) {
                      setAmenities([...amenities, value])
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('custom-amenity-input-edit') as HTMLInputElement
                  const value = input?.value.trim()
                  if (value && !amenities.includes(value)) {
                    setAmenities([...amenities, value])
                    input.value = ''
                  }
                }}
                className="px-4 py-2 bg-resort-500 text-white rounded-lg font-medium text-sm hover:bg-resort-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
          <textarea 
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none" 
            placeholder="Describe your resort, amenities, and what makes it special. Include details about nearby attractions, unique features, and guest experiences." 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            rows={5}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Check-in Time</label>
            <TimePicker
              value={checkInTime}
              onChange={setCheckInTime}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Check-out Time</label>
            <TimePicker
              value={checkOutTime}
              onChange={setCheckOutTime}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">House Rules</label>
          <textarea 
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none" 
            placeholder="e.g., No smoking inside, No loud music after 10 PM, Pets allowed with deposit" 
            value={houseRules} 
            onChange={e => setHouseRules(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Cancellation Policy</label>
          <Select
            ariaLabel="Cancellation policy"
            className="w-full"
            value={cancellationPolicy}
            onChange={e => setCancellationPolicy(e.target.value)}
          >
            <option value="flexible">Flexible - Full refund up to 24 hours before check-in</option>
            <option value="moderate">Moderate - Full refund up to 5 days before check-in</option>
            <option value="strict">Strict - Full refund up to 14 days before check-in</option>
            <option value="no-refund">No Refund - Non-refundable booking</option>
          </Select>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <FiCamera className="w-5 h-5" />
            <label className="text-sm font-bold text-slate-700">Resort Images * <span className="text-slate-500 font-normal">(1 required, up to 10)</span></label>
          </div>
          <ImageUploader 
            existingUrls={images}
            onUpload={(urls) => setImages(prev => [...prev, ...urls].slice(0, 10))} 
            onRemove={(url) => setImages(prev => prev.filter(u => u !== url))}
            maxFiles={10}
          />
          {images.length === 0 && <p className="text-xs text-red-500 mt-2">At least 1 image is required</p>}
        </div>

        <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
          <button 
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2"><FiClock className="w-5 h-5" /> Updating...</span>
            ) : (
              <span className="inline-flex items-center gap-2"><FiSave className="w-5 h-5" /> Save Changes</span>
            )}
          </button>
          <Link href="/owner/my-resorts" className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-lg text-center hover:bg-slate-50 transition-all text-slate-700">
            Cancel
          </Link>
        </div>

        <div className="pt-6 border-t-2 border-slate-100">
          <button 
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="w-full px-6 py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-2"><FiTrash2 className="w-5 h-5" /> Delete Resort</span>
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">This action cannot be undone</p>
        </div>
      </form>
      </div>
    </div>
  )
}
