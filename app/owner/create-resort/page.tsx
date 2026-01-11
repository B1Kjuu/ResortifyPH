'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Select from '../../../components/Select'
import TimePicker from '../../../components/TimePicker'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import ImageUploader from '../../../components/ImageUploader'
import LocationCombobox from '../../../components/LocationCombobox'
import LocationPicker from '../../../components/LocationPicker'
import PricingConfigurator from '../../../components/PricingConfigurator'
import { getProvinceInfo } from '../../../lib/locations'
import { supabase } from '../../../lib/supabaseClient'
import { generateUniqueResortSlug } from '../../../lib/slug'
import { resortSchema, type ResortInput, type ResortPricingConfig } from '../../../lib/validations'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { FiMapPin, FiDollarSign, FiUsers, FiCamera, FiCheck, FiClock } from 'react-icons/fi'
import { FaUmbrellaBeach, FaMountain, FaLeaf, FaCity, FaTractor, FaSwimmer, FaStar } from 'react-icons/fa'
import { RESORT_TYPES } from '../../../lib/resortTypes'

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
  pricing_config: null,
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
  registration_number: '',
  dti_sec_certificate_url: '',
  business_permit_url: '',
  gov_id_owner_url: '',
  website_url: '',
  facebook_url: '',
  instagram_url: '',
}

export default function CreateResort() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  // Always use advanced pricing
  const pricingMode = 'advanced'

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

  const onFormError = (formErrors: any) => {
    console.error('[CreateResort] Validation errors:', formErrors)
    // Scroll to error summary
    const errorSummary = document.getElementById('validation-error-summary')
    if (errorSummary) {
      errorSummary.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

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
    
    // Extract minimum legacy prices from advanced pricing config for backward compatibility
    const pricingConfig = values.pricing_config
    let day_tour_price: number | null = null
    let overnight_price: number | null = null
    let night_tour_price: number | null = null
    
    if (pricingConfig?.pricing && Array.isArray(pricingConfig.pricing)) {
      // Get minimum prices for each booking type (for display on cards/filters)
      const daytourPrices = pricingConfig.pricing.filter(p => p.bookingType === 'daytour').map(p => p.price).filter(p => p > 0)
      const overnightPrices = pricingConfig.pricing.filter(p => p.bookingType === 'overnight').map(p => p.price).filter(p => p > 0)
      const hrs22Prices = pricingConfig.pricing.filter(p => p.bookingType === '22hrs').map(p => p.price).filter(p => p > 0)
      
      if (daytourPrices.length > 0) day_tour_price = Math.min(...daytourPrices)
      if (overnightPrices.length > 0) overnight_price = Math.min(...overnightPrices)
      if (hrs22Prices.length > 0) night_tour_price = Math.min(...hrs22Prices) // Use night_tour_price for 22hrs
    }
    
    const slug = await generateUniqueResortSlug(values.name, supabase)

    const payload = {
      owner_id: userId,
      name: values.name,
      slug,
      description: values.description,
      location: values.location,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
      address: values.address?.trim() || null,
      region_code: provinceInfo?.regionCode ?? null,
      region_name: provinceInfo?.regionName ?? null,
      type: values.type,
      pricing_config: values.pricing_config ?? null,
      use_advanced_pricing: true, // Always use advanced pricing
      // Sync legacy prices for backward compatibility with ResortCard/filters
      day_tour_price,
      overnight_price,
      night_tour_price,
      price: day_tour_price || overnight_price || night_tour_price, // General display price
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
      registration_number: values.registration_number?.trim() || null,
      dti_sec_certificate_url: values.dti_sec_certificate_url?.trim() || null,
      business_permit_url: values.business_permit_url?.trim() || null,
      gov_id_owner_url: values.gov_id_owner_url?.trim() || null,
      website_url: values.website_url?.trim() || null,
      facebook_url: values.facebook_url?.trim() || null,
      instagram_url: values.instagram_url?.trim() || null,
      status: 'pending',
      created_at: new Date(),
    }

    const { error } = await supabase.from('resorts').insert([payload])
    toast.dismiss()

    if (error) {
      toast.error(`Error: ${error.message}`)
      return
    }

    // Notify admins of new submission
    try {
      await fetch('/api/notifications/resort-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resortName: values.name,
          ownerName: undefined,
          ownerEmail: (await supabase.auth.getUser()).data.user?.email || 'owner',
          ownerId: userId,
          location: values.location,
          price: values.price,
        })
      })
    } catch (notifyErr) {
      console.warn('Admin notify (resort submitted) failed:', notifyErr)
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
        <Link
          href="/owner/dashboard"
          className="inline-flex items-center gap-2 text-resort-600 hover:text-resort-700 font-semibold mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>

        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <FaUmbrellaBeach className="w-6 h-6 sm:w-8 sm:h-8 text-resort-600" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-resort-600 to-ocean-500 bg-clip-text text-transparent">
              Create New Resort
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-slate-600 pl-8 sm:pl-14">
            Submit your resort for approval. Fill in all details carefully.
          </p>
          <div className="mt-3 sm:mt-4 sm:pl-14">
            <DisclaimerBanner title="Owner Payment Notice">
              ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
            </DisclaimerBanner>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit(onSubmit, onFormError)} className="bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Resort Name *</label>
            <input
              type="text"
              placeholder="e.g., Paradise Beach Resort"
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors text-sm sm:text-base ${errors.name ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Province/Region *</label>
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
              <FiMapPin className="w-5 h-5" />
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
            <Select ariaLabel="Resort type" className="w-full" {...register('type')}>
              {RESORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
          </div>

          <div className="bg-gradient-to-br from-resort-50 to-blue-50 border-2 border-resort-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FiDollarSign className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Pricing Configuration</h3>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-emerald-800">
                <strong>Advanced Pricing:</strong> Set different prices for weekdays vs weekends, and create guest count tiers (e.g., 20 pax vs 30 pax). 
                Perfect for Philippine resorts with tiered pricing.
              </p>
            </div>

            {/* Advanced Pricing Configurator */}
            <Controller
              name="pricing_config"
              control={control}
              render={({ field }) => (
                <PricingConfigurator
                  value={field.value ?? null}
                  onChange={(config) => field.onChange(config)}
                  capacity={watch('capacity') || 50}
                />
              )}
            />
            {errors.pricing_config && (
              <p className="text-xs text-red-500 mt-1">
                {(errors.pricing_config as any)?.message || 'Please complete all pricing configuration fields'}
              </p>
            )}
          </div>

          {/* Verification details (optional) */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 inline-block">🔒</span>
              <h3 className="text-lg font-bold text-slate-900">Verification Details (Optional)</h3>
            </div>
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 font-medium">
                💡 <strong>Tip:</strong> The more verification details you provide, the better your chances of getting approved quickly. 
                Business documents and social media links help build trust with guests.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Business Registration Number</label>
                  <input className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" placeholder="Optional" {...register('registration_number')} />
                  {errors.registration_number && <p className="text-xs text-red-500 mt-1">{errors.registration_number.message as any}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">DTI/SEC Certificate (Image)</label>
                  <ImageUploader 
                    bucket="verification-docs" 
                    multiple={false}
                    maxFiles={1}
                    compact={true}
                    existingUrls={watch('dti_sec_certificate_url') ? [watch('dti_sec_certificate_url') as string] : []}
                    onUpload={(urls) => setValue('dti_sec_certificate_url', urls[0] || '', { shouldValidate: true })} 
                    onRemove={() => setValue('dti_sec_certificate_url', '', { shouldValidate: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Business Permit (Image)</label>
                  <ImageUploader 
                    bucket="verification-docs" 
                    multiple={false}
                    maxFiles={1}
                    compact={true}
                    existingUrls={watch('business_permit_url') ? [watch('business_permit_url') as string] : []}
                    onUpload={(urls) => setValue('business_permit_url', urls[0] || '', { shouldValidate: true })} 
                    onRemove={() => setValue('business_permit_url', '', { shouldValidate: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Owner Government ID (Image)</label>
                  <ImageUploader 
                    bucket="verification-docs" 
                    multiple={false}
                    maxFiles={1}
                    compact={true}
                    existingUrls={watch('gov_id_owner_url') ? [watch('gov_id_owner_url') as string] : []}
                    onUpload={(urls) => setValue('gov_id_owner_url', urls[0] || '', { shouldValidate: true })} 
                    onRemove={() => setValue('gov_id_owner_url', '', { shouldValidate: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Website <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" placeholder="https://" {...register('website_url')} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Facebook Page <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" placeholder="https://facebook.com/..." {...register('facebook_url')} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Instagram <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" placeholder="https://instagram.com/..." {...register('instagram_url')} />
                </div>
              </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiUsers className="w-4 h-4" /> Guest Capacity *</label>
              <input
                type="number"
                min={1}
                max={150}
                placeholder="e.g., 10"
                onInput={(e) => {
                  const input = e.target as HTMLInputElement
                  // Remove non-digits and leading zeros
                  input.value = input.value.replace(/[^0-9]/g, '').replace(/^0+/, '') || ''
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors ${errors.capacity ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
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
                min={0}
                max={50}
                placeholder="e.g., 3"
                onInput={(e) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.replace(/[^0-9]/g, '') || ''
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors ${errors.bedrooms ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
                {...register('bedrooms', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
              {errors.bedrooms && <p className="text-xs text-red-500 mt-1">{errors.bedrooms.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Number of Bathrooms</label>
              <input
                type="number"
                min={0}
                max={50}
                placeholder="e.g., 2"
                onInput={(e) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.replace(/[^0-9]/g, '') || ''
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors ${errors.bathrooms ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
                {...register('bathrooms', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
              {errors.bathrooms && <p className="text-xs text-red-500 mt-1">{errors.bathrooms.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number *</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={13}
              placeholder="e.g., 09171234567"
              onInput={(e) => {
                const input = e.target as HTMLInputElement
                // Allow only digits and + at the start for +63 format
                input.value = input.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '')
              }}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors ${errors.contact_number ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
              {...register('contact_number')}
            />
            <p className="text-xs text-slate-500 mt-1">Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
            {errors.contact_number && <p className="text-xs text-red-500 mt-1">{errors.contact_number.message}</p>}
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaStar className="w-5 h-5" />
                <label className="text-sm font-bold text-slate-700">Amenities</label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValue('amenities', [...AMENITIES], { shouldValidate: true, shouldDirty: true })}
                  className="px-3 py-1.5 text-xs font-medium bg-resort-100 text-resort-700 rounded-lg hover:bg-resort-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setValue('amenities', [], { shouldValidate: true, shouldDirty: true })}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 sm:gap-3 cursor-pointer bg-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-slate-200 hover:border-resort-400 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-resort-500 border-slate-300 rounded focus:ring-2 focus:ring-resort-400 flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-700 break-words">{amenity}</span>
                </label>
              ))}
            </div>
            
            {/* Custom amenities display */}
            {amenities.filter(a => !AMENITIES.includes(a)).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Custom Amenities:</p>
                <div className="flex flex-wrap gap-2">
                  {amenities.filter(a => !AMENITIES.includes(a)).map(customAmenity => (
                    <span 
                      key={customAmenity}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-resort-100 text-resort-700 rounded-full text-sm font-medium"
                    >
                      {customAmenity}
                      <button
                        type="button"
                        onClick={() => toggleAmenity(customAmenity)}
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
                  id="custom-amenity-input"
                  placeholder="e.g., Hammock, Fire Pit, Telescope..."
                  className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const input = e.target as HTMLInputElement
                      const value = input.value.trim()
                      if (value && !amenities.includes(value)) {
                        toggleAmenity(value)
                        input.value = ''
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('custom-amenity-input') as HTMLInputElement
                    const value = input?.value.trim()
                    if (value && !amenities.includes(value)) {
                      toggleAmenity(value)
                      input.value = ''
                    }
                  }}
                  className="px-4 py-2 bg-resort-500 text-white rounded-lg font-medium text-sm hover:bg-resort-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
            
            {errors.amenities && <p className="text-xs text-red-500 mt-3">{errors.amenities.message}</p>}
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FaSwimmer className="w-6 h-6" />
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
              <label className="block text-sm font-bold text-slate-700 mb-2">Parking Slots</label>
              <input
                type="number"
                min={0}
                max={50}
                placeholder="e.g., 2"
                onInput={(e) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.replace(/[^0-9]/g, '') || ''
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors ${errors.parking_slots ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
                {...register('parking_slots', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                })}
              />
              {errors.parking_slots && <p className="text-xs text-red-500 mt-1">{errors.parking_slots.message}</p>}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> Nearby Landmarks</label>
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
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-colors resize-none ${errors.description ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-resort-400 focus:border-resort-400 hover:border-slate-300'}`}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Check-in Time</label>
              <Controller
                name="check_in_time"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    value={field.value || '14:00'}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Check-out Time</label>
              <Controller
                name="check_out_time"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    value={field.value || '12:00'}
                    onChange={field.onChange}
                  />
                )}
              />
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
            <label className="block text-sm font-bold text-slate-700 mb-2">Bring Your Own Items</label>
            <textarea
              rows={3}
              placeholder="e.g., Food and drinks, towels, toiletries"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors resize-none"
              {...register('bring_own_items')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Cancellation Policy *</label>
            <Select 
              ariaLabel="Cancellation policy" 
              className={`w-full ${errors.cancellation_policy ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
              {...register('cancellation_policy')}
            >
              {CANCELLATION_POLICIES.map((policy) => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </Select>
            {errors.cancellation_policy && <p className="text-xs text-red-500 mt-1">{errors.cancellation_policy.message}</p>}
          </div>

          <div className={`bg-slate-50 border-2 rounded-xl p-6 ${errors.images ? 'border-red-400' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <FiCamera className="w-5 h-5" />
              <label className="text-sm font-bold text-slate-700">Resort Images * <span className="text-slate-500 font-normal">(1 required, up to 10)</span></label>
            </div>
            <ImageUploader 
              onUpload={handleImageUpload} 
              existingUrls={images}
              onRemove={removeImage}
              maxFiles={10}
            />
            {errors.images && <p className="text-xs text-red-500 mt-2">{errors.images.message}</p>}
          </div>

          {/* Validation Errors Summary */}
          {Object.keys(errors).length > 0 && (
            <div id="validation-error-summary" className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm font-bold text-red-700 mb-2">Please fix the following errors:</p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, err]) => (
                  <li key={field}><strong>{field}:</strong> {(err as any)?.message || 'Invalid'}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold text-base sm:text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2"><FiClock className="w-4 sm:w-5 h-4 sm:h-5" /> Creating...</span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2"><FaStar className="w-4 sm:w-5 h-4 sm:h-5" /> Create Resort</span>
              )}
            </button>
            <Link
              href="/owner/dashboard"
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-slate-300 rounded-xl font-bold text-base sm:text-lg text-center hover:bg-slate-50 transition-all text-slate-700 active:scale-[0.98]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
