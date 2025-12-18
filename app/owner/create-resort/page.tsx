'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import ImageUploader from '../../../components/ImageUploader'
import LocationCombobox from '../../../components/LocationCombobox'
import LocationPicker from '../../../components/LocationPicker'
import { getProvinceInfo } from '../../../lib/locations'
import { supabase } from '../../../lib/supabaseClient'
import { resortSchema, type ResortInput } from '../../../lib/validations'

const AMENITIES = [
  'Pool',
  'WiFi',
  'Parking',
  'Breakfast',
  'Beachfront',
  'Air Conditioning',
  'Spa',
  'Bar',
  'Pet Friendly',
  'Kitchen',
  'BBQ Grill',
  'Videoke',
  'Netflix',
  'Billiards',
  'Game Room',
  'Outdoor Seating',
]

const CANCELLATION_POLICIES: { value: ResortInput['cancellation_policy']; label: string }[] = [
  { value: 'flexible', label: 'Flexible — Full refund up to 24 hours before check-in' },
  { value: 'moderate', label: 'Moderate — Full refund up to 5 days before check-in' },
  { value: 'strict', label: 'Strict — Full refund up to 14 days before check-in' },
  { value: 'no_refund', label: 'No Refund — Non-refundable booking' },
]

const defaultResortValues: Partial<ResortInput> = {
  name: '',
  description: '',
  location: '',
  latitude: null,
  longitude: null,
  address: '',
  type: 'city',
  price: undefined,
  day_tour_price: null,
  night_tour_price: null,
  overnight_price: null,
  additional_guest_fee: null,
  capacity: undefined,
  bedrooms: null,
  bathrooms: null,
  amenities: [],
  images: [],
  contact_number: '',
  check_in_time: '14:00',
  check_out_time: '12:00',
  house_rules: '',
  cancellation_policy: 'flexible',
  pool_size: '',
  pool_depth: '',
  has_pool_heating: false,
  has_jacuzzi: false,
  parking_slots: null,
  nearby_landmarks: '',
  bring_own_items: '',
}

export default function CreateResort() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResortInput, any>({
    resolver: zodResolver(resortSchema) as any,
    defaultValues: defaultResortValues,
  })

  const amenities = watch('amenities') ?? []
  const images = watch('images') ?? []

  useEffect(() => {
    let ignore = false

    async function loadUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const sessionUser = sessionData.session?.user
        if (!sessionUser) {
          router.push('/auth/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionUser.id)
          .single()

        if (!profile || profile.role !== 'owner') {
          router.push('/owner/dashboard')
          return
        }

        if (!ignore) {
          setUserId(sessionUser.id)
          setIsAuthorized(true)
          setLoading(false)
        }
      } catch (error) {
        console.error('Profile lookup failed:', error)
        router.push('/auth/login')
      }
    }

    loadUser()
    return () => {
      ignore = true
    }
  }, [router])

  const toggleAmenity = (amenity: string) => {
    const next = amenities.includes(amenity)
      ? amenities.filter((item) => item !== amenity)
      : [...amenities, amenity]

    setValue('amenities', next, { shouldValidate: true, shouldDirty: true })
  }

  const handleImageUpload = (urls: string[]) => {
    if (!urls.length) return
    setValue('images', [...images, ...urls], { shouldValidate: true, shouldDirty: true })
  }

  const removeImage = (url: string) => {
    setValue(
      'images',
      images.filter((image) => image !== url),
      { shouldValidate: true, shouldDirty: true },
    )
  }

  const onSubmit = async (values: ResortInput) => {
    if (!userId) {
      toast.error('You must be signed in as an owner to create a resort.')
      return
    }

    toast.loading('Creating resort...')
    const provinceInfo = getProvinceInfo(values.location)
    const payload = {
      owner_id: userId,
      name: values.name,
      description: values.description,
      location: values.location,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
      address: values.address?.trim() || null,
      region_code: provinceInfo?.regionCode ?? null,
      region_name: provinceInfo?.regionName ?? null,
      type: values.type,
      price: values.price,
      day_tour_price: values.day_tour_price ?? null,
      night_tour_price: values.night_tour_price ?? null,
      overnight_price: values.overnight_price ?? null,
      additional_guest_fee: values.additional_guest_fee ?? null,
      capacity: values.capacity,
      bedrooms: values.bedrooms ?? null,
      bathrooms: values.bathrooms ?? null,
      amenities: values.amenities ?? [],
      images: values.images ?? [],
      contact_number: values.contact_number,
      check_in_time: values.check_in_time,
      check_out_time: values.check_out_time,
      house_rules: values.house_rules?.trim() || null,
      cancellation_policy: values.cancellation_policy,
      pool_size: values.pool_size?.trim() || null,
      pool_depth: values.pool_depth?.trim() || null,
      has_pool_heating: values.has_pool_heating,
      has_jacuzzi: values.has_jacuzzi,
      parking_slots: typeof values.parking_slots === 'number' ? values.parking_slots : null,
      nearby_landmarks: values.nearby_landmarks?.trim() || null,
      bring_own_items: values.bring_own_items?.trim() || null,
      status: 'pending',
      created_at: new Date(),
    }

    const { error } = await supabase.from('resorts').insert([payload])
    toast.dismiss()

    if (error) {
      toast.error(`Error: ${error.message}`)
      return
    }

    toast.success('Resort created! Pending admin approval.')
    reset(defaultResortValues)
    router.push('/owner/my-resorts')
  }

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">
        Loading...
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
        <Link
          href="/owner/dashboard"
          className="inline-flex items-center gap-2 text-resort-600 hover:text-resort-700 font-semibold mb-6 transition-colors"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🏝️</span>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">
              Create New Resort
            </h1>
          </div>
          <p className="text-lg text-slate-600 pl-14">
            Submit your resort for approval. Fill in all details carefully.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resort Name *</label>
            <input
              type="text"
              placeholder="e.g., Paradise Beach Resort"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Province/Region *</label>
            <Controller
              name="location"
              control={control}
              rules={{ required: 'Location is required' }}
              render={({ field }) => (
                <LocationCombobox
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={(province) => {
                    field.onChange(province || '')
                    field.onBlur()
                  }}
                  error={errors.location?.message || (!field.value ? 'Location is required' : undefined)}
                  placeholder="Search or pick a province"
                />
              )}
            />
          </div>

          {/* Exact Location Map Picker */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📍</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pin Your Exact Location</h3>
                <p className="text-sm text-slate-600">Help guests find your resort easily on the map</p>
              </div>
            </div>
            <LocationPicker
              latitude={watch('latitude') ?? null}
              longitude={watch('longitude') ?? null}
              address={watch('address') ?? ''}
              onLocationChange={(lat, lng) => {
                setValue('latitude', lat, { shouldValidate: true })
                setValue('longitude', lng, { shouldValidate: true })
              }}
              onAddressChange={(addr) => {
                setValue('address', addr, { shouldValidate: true })
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resort Type *</label>
            <select
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              {...register('type')}
            >
              <option value="beach">🏖️ Beach Resort</option>
              <option value="mountain">🏔️ Mountain Resort</option>
              <option value="nature">🌿 Nature Retreat</option>
              <option value="city">🏙️ City Resort</option>
              <option value="countryside">🌾 Countryside</option>
            </select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
          </div>

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
                  placeholder="e.g., 5000"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('price', {
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Day Tour Price (₱)</label>
                <input
                  type="number"
                  placeholder="e.g., 4999"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('day_tour_price', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Night Tour Price (₱)</label>
                <input
                  type="number"
                  placeholder="e.g., 5999"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('night_tour_price', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Overnight Stay (₱)</label>
                <input
                  type="number"
                  placeholder="e.g., 7999"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('overnight_price', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Additional Guest Fee (₱)</label>
                <input
                  type="number"
                  placeholder="e.g., 350"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('additional_guest_fee', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Guest Capacity *</label>
              <input
                type="number"
                placeholder="e.g., 10"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                {...register('capacity', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
              />
              {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity.message}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bedrooms</label>
              <input
                type="number"
                placeholder="e.g., 3"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                {...register('bedrooms', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bathrooms</label>
              <input
                type="number"
                placeholder="e.g., 2"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                {...register('bathrooms', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number *</label>
            <input
              type="tel"
              placeholder="e.g., +63 912 345 6789"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
              {...register('contact_number')}
            />
            {errors.contact_number && <p className="text-xs text-red-500 mt-1">{errors.contact_number.message}</p>}
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✨</span>
              <label className="text-sm font-bold text-slate-700">Amenities</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-3 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-slate-200 hover:border-resорт-400 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-5 h-5 text-resort-500 border-slate-300 rounded focus:ring-2 focus:ring-resort-400"
                  />
                  <span className="text-sm font-medium text-slate-700">{amenity}</span>
                </label>
              ))}
            </div>
            {errors.amenities && <p className="text-xs text-red-500 mt-3">{errors.amenities.message}</p>}
          </div>

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
                  placeholder="e.g., 3x6 meters"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('pool_size')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pool Depth</label>
                <input
                  type="text"
                  placeholder="e.g., 4.5 feet"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white"
                  {...register('pool_depth')}
                />
              </div>
            </div>

            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-lg border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                <input type="checkbox" className="w-5 h-5 text-cyan-500 border-slate-300 rounded focus:ring-2 focus:ring-cyan-400" {...register('has_pool_heating')} />
                <span className="text-sm font-semibold text-slate-700">🔥 Heated Pool</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-lg border-2 border-slate-200 hover:border-cyan-400 transition-colors">
                <input type="checkbox" className="w-5 h-5 text-cyan-500 border-slate-300 rounded focus:ring-2 focus:ring-cyan-400" {...register('has_jacuzzi')} />
                <span className="text-sm font-semibold text-slate-700">💆 Jacuzzi Available</span>
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">🅿️ Parking Slots</label>
              <input
                type="number"
                placeholder="e.g., 2"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                {...register('parking_slots', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">📍 Nearby Landmarks</label>
              <input
                type="text"
                placeholder="e.g., 5 mins from town center"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors"
                {...register('nearby_landmarks')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description *</label>
            <textarea
              rows={5}
              placeholder="Describe your resort, amenities, and what makes it special..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Check-in Time</label>
              <input type="time" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" {...register('check_in_time')} />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Check-out Time</label>
              <input type="time" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors" {...register('check_out_time')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">House Rules</label>
            <textarea
              rows={3}
              placeholder="e.g., No smoking inside, quiet hours after 10 PM"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none"
              {...register('house_rules')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">🎒 Bring Your Own Items</label>
            <textarea
              rows={3}
              placeholder="e.g., Food and drinks, towels, toiletries"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none"
              {...register('bring_own_items')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Cancellation Policy</label>
            <select
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shawdow-sm hover:border-slate-300 transition-colors cursor-pointer"
              {...register('cancellation_policy')}
            >
              {CANCELLATION_POLICIES.map((policy) => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📸</span>
              <label className="text-sm font-bold text-slate-700">Resort Images</label>
            </div>
            <ImageUploader onUpload={handleImageUpload} />
            {errors.images && <p className="text-xs text-red-500 mt-2">{errors.images.message}</p>}

            {images.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-semibold">
                  ✓ {images.length} image(s) uploaded
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="Uploaded" className="w-full h-32 object-cover rounded-lg border-2 border-slate-200" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-2 right-2 bg-white/90 text-red-600 text-xs font-bold px-2 py-1 rounded shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '⏳ Creating...' : '✨ Create Resort'}
            </button>
            <Link
              href="/owner/dashboard"
              className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-lg text-center hover:bg-slate-50 transition-all text-slate-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
