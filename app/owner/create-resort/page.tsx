'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUploader from '../../../components/ImageUploader'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CreateResort(){
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
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getUser(){
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
        .single()
      if (profile?.role !== 'owner') {
        router.push('/owner/dashboard')
        setLoading(false)
        return
      }

      setUserId(session.user.id)
      setIsAuthorized(true)
      setLoading(false)
    }
    getUser()
  }, [router])

  async function handleCreate(e: React.FormEvent){
    e.preventDefault()
    
    // Validation
    if (!name || name.length < 5) {
      toast.error('Resort name must be at least 5 characters')
      return
    }
    if (!description || description.length < 20) {
      toast.error('Description must be at least 20 characters')
      return
    }
    if (!location || location.length < 5) {
      toast.error('Location must be at least 5 characters')
      return
    }
    if (!price || price < 500) {
      toast.error('Price must be at least ₱500')
      return
    }
    if (!capacity || capacity < 1) {
      toast.error('Capacity must be at least 1')
      return
    }
    if (!contactNumber || !/^(\+63|0)?9\d{9}$/.test(contactNumber)) {
      toast.error('Invalid Philippine mobile number (e.g., 09171234567)')
      return
    }
    
    setSubmitting(true)
    toast.loading('Creating resort...')
    const { error } = await supabase.from('resorts').insert([{ 
      owner_id: userId, 
      name, 
      description, 
      location, 
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
      status: 'pending', 
      created_at: new Date() 
    }])
    
    setSubmitting(false)
    toast.dismiss()
    
    if (error) { 
      toast.error('Error: ' + error.message)
      return 
    }
    
    toast.success('Resort created! Pending admin approval.')
    router.push('/owner/my-resorts')
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>
  if (!isAuthorized) return null

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
        <Link href="/owner/dashboard" className="inline-flex items-center gap-2 text-resort-600 hover:text-resort-700 font-semibold mb-6 transition-colors">
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🏝️</span>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Create New Resort</h1>
          </div>
          <p className="text-lg text-slate-600 pl-14">Submit your resort for approval. Fill in all details carefully.</p>
        </div>

        <form onSubmit={handleCreate} className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
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
          <label className="block text-sm font-bold text-slate-700 mb-2">Location *</label>
          <select
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
          >
            <option value="">Select province...</option>
            <option value="Metro Manila">Metro Manila</option>
            <option value="Cavite">Cavite</option>
            <option value="Laguna">Laguna</option>
            <option value="Batangas">Batangas</option>
            <option value="Cebu">Cebu</option>
            <option value="Iloilo">Iloilo</option>
            <option value="Davao">Davao</option>
            <option value="Cagayan de Oro">Cagayan de Oro</option>
            <option value="Palawan">Palawan</option>
            <option value="Boracay">Boracay</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Resort Type *</label>
          <select
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
            value={type}
            onChange={e => setType(e.target.value)}
            required
          >
            <option value="beach">🏖️ Beach Resort</option>
            <option value="mountain">🏔️ Mountain Resort</option>
            <option value="nature">🌿 Nature Retreat</option>
            <option value="city">🏙️ City Resort</option>
            <option value="countryside">🌾 Countryside</option>
          </select>
        </div>

        {/* Pricing Section */}
        <div className="bg-gradient-to-br from-resort-50 to-blue-50 border-2 border-resort-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-lg font-bold text-slate-900">Pricing Options</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Base Price per Night (₱) *</label>
              <input 
                type="number"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 5000" 
                value={price as any} 
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Day Tour Price (₱)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 4999" 
                value={dayTourPrice as any} 
                onChange={e => setDayTourPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">8 AM - 5 PM usage</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Night Tour Price (₱)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 5999" 
                value={nightTourPrice as any} 
                onChange={e => setNightTourPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">6 PM - 12 AM usage</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Overnight Stay (22hrs) (₱)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 7999" 
                value={overnightPrice as any} 
                onChange={e => setOvernightPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">20-22 hour stay</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Additional Guest Fee (₱)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 350" 
                value={additionalGuestFee as any} 
                onChange={e => setAdditionalGuestFee(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">Per extra person beyond capacity</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Guest Capacity *</label>
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
            <span className="text-xl">✨</span>
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

        {/* Pool Details */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏊</span>
            <h3 className="text-lg font-bold text-slate-900">Pool & Water Features</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pool Size</label>
              <input 
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 3x6 meters or 8.25x13.2 feet" 
                value={poolSize} 
                onChange={e => setPoolSize(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pool Depth</label>
              <input 
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white" 
                placeholder="e.g., 4.5 feet or 2ft-4.5ft" 
                value={poolDepth} 
                onChange={e => setPoolDepth(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-lg border-2 border-slate-200 hover:border-cyan-400 transition-colors">
              <input
                type="checkbox"
                checked={hasPoolHeating}
                onChange={e => setHasPoolHeating(e.target.checked)}
                className="w-5 h-5 text-cyan-500 border-slate-300 rounded focus:ring-2 focus:ring-cyan-400"
              />
              <span className="text-sm font-semibold text-slate-700">🔥 Heated Pool</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-lg border-2 border-slate-200 hover:border-cyan-400 transition-colors">
              <input
                type="checkbox"
                checked={hasJacuzzi}
                onChange={e => setHasJacuzzi(e.target.checked)}
                className="w-5 h-5 text-cyan-500 border-slate-300 rounded focus:ring-2 focus:ring-cyan-400"
              />
              <span className="text-sm font-semibold text-slate-700">💆 Jacuzzi Available</span>
            </label>
          </div>
        </div>

        {/* Parking & Location */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">🅿️ Parking Slots</label>
            <input 
              type="number"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 2" 
              value={parkingSlots as any} 
              onChange={e => setParkingSlots(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <p className="text-xs text-slate-500 mt-1">Number of car parking spaces</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">📍 Nearby Landmarks</label>
            <input 
              type="text"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" 
              placeholder="e.g., 5 mins from 7/11, 10 mins from Robinsons Mall" 
              value={nearbyLandmarks} 
              onChange={e => setNearbyLandmarks(e.target.value)}
            />
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
            placeholder="e.g., No smoking inside, No loud music after 10 PM, CLAYGO Policy (Clean As You Go), Pets allowed with deposit" 
            value={houseRules} 
            onChange={e => setHouseRules(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">🎒 Bring Your Own Items</label>
          <textarea 
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none" 
            placeholder="e.g., Food and drinks, Towel and toiletries, Disposable tableware, Charcoal for grilling" 
            value={bringOwnItems} 
            onChange={e => setBringOwnItems(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-slate-500 mt-1">List items guests should bring themselves</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Cancellation Policy</label>
          <select
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
            value={cancellationPolicy}
            onChange={e => setCancellationPolicy(e.target.value)}
          >
            <option value="flexible">Flexible - Full refund up to 24 hours before check-in</option>
            <option value="moderate">Moderate - Full refund up to 5 days before check-in</option>
            <option value="strict">Strict - Full refund up to 14 days before check-in</option>
            <option value="no-refund">No Refund - Non-refundable booking</option>
          </select>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📸</span>
            <label className="text-sm font-bold text-slate-700">Resort Images</label>
          </div>
          <ImageUploader onUpload={(urls) => setImages(urls)} />
          {images.length > 0 && (
            <div className="mt-3 px-4 py-2 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm text-green-700 font-semibold">{images.length} image(s) uploaded successfully</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-6">
          <button 
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '⏳ Creating...' : '✨ Create Resort'}
          </button>
          <Link href="/owner/dashboard" className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-lg text-center hover:bg-slate-50 transition-all text-slate-700">
            Cancel
          </Link>
        </div>
      </form>
      </div>
    </div>
  )
}
