'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUploader from '../../../../components/ImageUploader'
import LocationCombobox from '../../../../components/LocationCombobox'
import Select from '../../../../components/Select'
import DisclaimerBanner from '../../../../components/DisclaimerBanner'
import PricingConfigurator from '../../../../components/PricingConfigurator'
import { getProvinceInfo } from '../../../../lib/locations'
import { supabase } from '../../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
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
      setPricingMode(resort.pricing_config ? 'advanced' : 'simple')
      
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
    if (!userId || !name || !location || !price || !capacity || !contactNumber) { 
      alert('Please fill all required fields'); 
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
        region_code: provinceInfo?.regionCode ?? null,
        region_name: provinceInfo?.regionName ?? null,
        type,
        price: Number(price),
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
        updated_at: new Date() 
      })
      .eq('id', resortId)
      .eq('owner_id', userId)
    
    if (error) { 
      alert('Error: ' + error.message)
      setSubmitting(false)
      return 
    }
    
    alert('Resort updated successfully!')
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
      alert('Error deleting resort: ' + error.message)
      setSubmitting(false)
      return
    }

    alert('Resort deleted successfully')
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
          <label className="block text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> Location *</label>
          <LocationCombobox
            value={location}
            onChange={setLocation}
            placeholder="Search or pick a province"
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
              ? 'Set a single price per night for your resort.'
              : 'Configure tiered pricing with daytour, overnight, and 22-hour options, plus weekday/weekend rates.'}
          </p>
        </div>

        {/* Simple Pricing Mode */}
        {pricingMode === 'simple' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Price per Night (₱) *</label>
            <input 
              type="number"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 5000" 
              value={price as any} 
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required={pricingMode === 'simple'}
            />
          </div>
        </div>
        )}

        {/* Advanced Pricing Mode */}
        {pricingMode === 'advanced' && (
          <PricingConfigurator
            value={pricingConfig}
            onChange={setPricingConfig}
            capacity={typeof capacity === 'number' ? capacity : undefined}
          />
        )}

        {/* Guest Capacity (shown in both modes) */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiUsers className="w-4 h-4" /> Guest Capacity *</label>
            <input 
              type="number"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 10" 
              value={capacity as any} 
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bedrooms</label>
            <input 
              type="number"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 3" 
              value={bedrooms as any} 
              onChange={e => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bathrooms</label>
            <input 
              type="number"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 2" 
              value={bathrooms as any} 
              onChange={e => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number *</label>
          <input 
            type="tel"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
            placeholder="e.g., +63 912 345 6789" 
            value={contactNumber} 
            onChange={e => setContactNumber(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">Guests will use this to contact you about bookings</p>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaStar className="w-5 h-5 text-slate-700" />
            <label className="text-sm font-bold text-slate-700">Amenities</label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['Pool', 'WiFi', 'Parking', 'Breakfast', 'Beachfront', 'Air Conditioning', 'Spa', 'Bar', 'Pet Friendly', 'Kitchen', 'BBQ Grill', 'Videoke', 'Netflix', 'Billiards', 'Game Room', 'Outdoor Seating'].map(amenity => (
              <label key={amenity} className="flex items-center gap-3 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-slate-200 hover:border-resort-400 transition-colors">
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
                  className="w-5 h-5 text-resort-500 border-slate-300 rounded focus:ring-2 focus:ring-resort-400"
                />
                <span className="text-sm font-medium text-slate-700">{amenity}</span>
              </label>
            ))}
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Check-in Time</label>
            <input 
              type="time"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              value={checkInTime} 
              onChange={e => setCheckInTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Check-out Time</label>
            <input 
              type="time"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              value={checkOutTime} 
              onChange={e => setCheckOutTime(e.target.value)}
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
            <label className="text-sm font-bold text-slate-700">Resort Images</label>
          </div>
          <ImageUploader onUpload={(urls) => setImages(urls)} />
          {images.length > 0 && (
            <div className="mt-3 px-4 py-2 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
              <FiCheck className="text-green-600 w-4 h-4" />
              <p className="text-sm text-green-700 font-semibold">{images.length} image(s) uploaded</p>
            </div>
          )}
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
