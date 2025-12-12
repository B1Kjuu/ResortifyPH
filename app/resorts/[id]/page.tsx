'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'
import { getProvinceInfo } from '../../../lib/locations'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import DateRangePicker from '../../../components/DateRangePicker'
import LocationCombobox from '../../../components/LocationCombobox'
import { format } from 'date-fns'

export default function ResortDetail({ params }: { params: { id: string } }){
  const [resort, setResort] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [activeImage, setActiveImage] = useState(0)
  const [guests, setGuests] = useState(1)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [quickExploreProvince, setQuickExploreProvince] = useState('')
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function load(){
      try {
        // Get resort
        const { data: resortData, error: resortError } = await supabase
          .from('resorts')
          .select('*')
          .eq('id', params.id)
          .single()
        
        if (!mounted) return

        if (resortError) {
          console.error('Resort error:', resortError)
          setLoading(false)
          return
        }

        if (!resortData) {
          setLoading(false)
          return
        }

        setResort(resortData)

        // Get owner info - with error handling
        if (resortData.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_admin')
            .eq('id', resortData.owner_id)
            .single()
          
          if (!mounted) return

          if (!ownerError && ownerData) {
            setOwner(ownerData)
          } else if (ownerError) {
            console.warn('Owner fetch warning (non-critical):', ownerError)
          }
        }

        // Get booked dates for this resort
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('date_from, date_to')
          .eq('resort_id', params.id)
          .in('status', ['pending', 'confirmed'])

        if (bookingsData && mounted) {
          // Create array of all booked dates (including ranges)
          const allBookedDates: string[] = []
          bookingsData.forEach(booking => {
            const start = new Date(booking.date_from)
            const end = new Date(booking.date_to)
            const current = new Date(start)
            
            while (current <= end) {
              allBookedDates.push(format(current, 'yyyy-MM-dd'))
              current.setDate(current.getDate() + 1)
            }
          })
          setBookedDates(allBookedDates)
        }

        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session?.user) {
          setUser(session.user)
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Load error:', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => { mounted = false }
  }, [params.id])

  function handleQuickExplore(province: string | null) {
    const selectedProvince = province || ''
    setQuickExploreProvince(selectedProvince)
    const query = selectedProvince ? `?location=${encodeURIComponent(selectedProvince)}` : ''
    router.push(`/resorts${query}`)
  }

  async function handleBooking(){
    if (!user) {
      toast.error('Please sign in to book this resort')
      setTimeout(() => router.push('/auth/signin'), 2000)
      return
    }

    if (!selectedRange.from || !selectedRange.to) {
      toast.error('Please select check-in and check-out dates')
      return
    }

    if (guests < 1) {
      toast.error('At least 1 guest required')
      return
    }

    if (guests > resort.capacity) {
      toast.error(`Maximum capacity is ${resort.capacity} guests`)
      return
    }

    setBooking(true)
    toast.loading('Creating booking...')

    const provinceInfo = getProvinceInfo(resort?.location)

    const { error } = await supabase.from('bookings').insert({
      resort_id: resort.id,
      guest_id: user.id,
      date_from: format(selectedRange.from, 'yyyy-MM-dd'),
      date_to: format(selectedRange.to, 'yyyy-MM-dd'),
      guest_count: guests,
      status: 'pending',
      resort_province: resort.location ?? null,
      resort_region_code: resort.region_code ?? provinceInfo?.regionCode ?? null,
      resort_region_name: resort.region_name ?? provinceInfo?.regionName ?? null,
    })

    setBooking(false)
    toast.dismiss()

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success('Booking request sent! The owner will review your request.')
      setSelectedRange({ from: undefined, to: undefined })
      setGuests(1)
    }
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-10 py-10 text-center">Loading resort...</div>
  if (!resort) return <div className="w-full px-4 sm:px-6 lg:px-10 py-10 text-center">Resort not found</div>

  const galleryImages = resort.images && resort.images.length > 0
    ? resort.images
    : resort.image_url
      ? [resort.image_url]
      : []

  const nightlyRate = resort.price
  const nights = selectedRange.from && selectedRange.to ? Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) : 0
  const totalCost = nights * nightlyRate

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-resort-50 to-white px-4 sm:px-6 lg:px-10 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/resorts" className="text-sm text-resort-500 font-semibold inline-flex items-center gap-1 hover:text-resort-600">
          <span aria-hidden>←</span> Back to Resorts
        </Link>

        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-6">
          {/* Main Content */}
          <div className="space-y-4">
            {/* Gallery */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-3">
              <div className="relative w-full h-[320px] sm:h-[420px] rounded-xl overflow-hidden bg-gradient-to-br from-resort-200 to-resort-300">
                {galleryImages.length > 0 ? (
                  <Image
                    src={galleryImages[activeImage]}
                    alt={resort.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 65vw, 100vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🏖️</div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow ${
                    resort.status === 'approved' ? 'bg-green-500 text-white' : 
                    resort.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {resort.status === 'approved' ? 'Available' : resort.status.charAt(0).toUpperCase() + resort.status.slice(1)}
                  </span>
                </div>
              </div>

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {galleryImages.slice(0, 5).map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`relative h-16 sm:h-18 rounded-lg overflow-hidden border ${activeImage === idx ? 'border-resort-500 ring-2 ring-resort-200' : 'border-slate-200'}`}
                    >
                      <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="120px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-resort-900">{resort.name}</h1>
                <div className="flex items-center gap-2 text-base text-slate-600">
                  <span>📍</span>
                  <span>{resort.location}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-xs text-slate-600">Price per night</p>
                    <p className="text-lg font-bold text-resort-900">₱{resort.price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <span className="text-xl">👥</span>
                  <div>
                    <p className="text-xs text-slate-600">Capacity</p>
                    <p className="text-lg font-bold text-resort-900">{resort.capacity} guests</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <span className="text-xl">🏷️</span>
                  <div>
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="text-lg font-bold text-resort-900">{resort.type || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Check-in / Check-out</p>
                  <p className="text-sm text-slate-600">Check-in: {resort.check_in_time || '2:00 PM'}</p>
                  <p className="text-sm text-slate-600">Check-out: {resort.check_out_time || '12:00 PM'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Contact</p>
                  <p className="text-sm text-slate-600">{resort.contact_number || 'Owner will share after booking'}</p>
                  {resort.nearby_landmarks && <p className="text-sm text-slate-600">Nearby: {resort.nearby_landmarks}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-resort-900">About This Resort</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{resort.description}</p>
              </div>

              {resort.amenities && resort.amenities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-resort-900">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {resort.amenities.map((amenity: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-resort-100 text-resort-800 rounded-lg text-xs font-medium">
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Pool & Extras</p>
                  <p className="text-sm text-slate-600">Pool size: {resort.pool_size || '—'}</p>
                  <p className="text-sm text-slate-600">Depth: {resort.pool_depth || '—'}</p>
                  <p className="text-sm text-slate-600">Heating: {resort.has_pool_heating ? 'Yes' : 'No'}</p>
                  <p className="text-sm text-slate-600">Jacuzzi: {resort.has_jacuzzi ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Rules & Fees</p>
                  <p className="text-sm text-slate-600">Cancellation: {resort.cancellation_policy || 'Flexible'}</p>
                  <p className="text-sm text-slate-600">Additional guest fee: {resort.additional_guest_fee ? `₱${Number(resort.additional_guest_fee).toLocaleString()}` : 'None'}</p>
                  <p className="text-sm text-slate-600">Parking: {resort.parking_slots ? `${resort.parking_slots} slot(s)` : 'On request'}</p>
                  {resort.bring_own_items && <p className="text-sm text-slate-600">Bring: {resort.bring_own_items}</p>}
                </div>
              </div>

              {owner && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-resort-100 rounded-full flex items-center justify-center text-lg">👤</div>
                  <div>
                    <p className="font-semibold text-resort-900">{owner.full_name}</p>
                    <p className="text-sm text-slate-600">Contact shared after booking</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-100 sticky top-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-resort-900">Book Your Stay</h2>
                <span className="text-sm text-slate-500">Flexible dates</span>
              </div>

              {message && (
                <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Dates</label>
                  <DateRangePicker 
                    bookedDates={bookedDates}
                    onSelectRange={setSelectedRange}
                    selectedRange={selectedRange}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Number of Guests</label>
                  <input 
                    type="number" 
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    min={1}
                    max={resort.capacity}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                  />
                  <p className="text-xs text-slate-500">Maximum: {resort.capacity} guests</p>
                </div>
              </div>

              {nights > 0 && (
                <div className="bg-resort-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>₱{nightlyRate.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
                    <span>₱{totalCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-resort-200 pt-2 flex justify-between font-bold text-resort-900">
                    <span>Total</span>
                    <span>₱{totalCost.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={handleBooking}
                disabled={booking || resort.status !== 'approved'}
                className="w-full px-5 py-3.5 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                {booking ? 'Booking...' : resort.status !== 'approved' ? 'Not Available' : 'Request to Book'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                You won't be charged yet. The owner will review your request.
              </p>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <p className="text-sm font-semibold text-slate-700 mb-2">Explore another province</p>
                <LocationCombobox
                  value={quickExploreProvince}
                  onChange={handleQuickExplore}
                  placeholder="Search or pick a province"
                />
                <p className="text-xs text-slate-500 mt-1">
                  We'll open the Explore page with this province filter so you can compare stays before booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
