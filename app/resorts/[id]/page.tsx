'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResortDetail({ params }: { params: { id: string } }){
  const [resort, setResort] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [guests, setGuests] = useState(1)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
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
            .select('full_name, email')
            .eq('id', resortData.owner_id)
            .single()
          
          if (!mounted) return

          if (!ownerError && ownerData) {
            setOwner(ownerData)
          } else if (ownerError) {
            console.warn('Owner fetch warning (non-critical):', ownerError)
          }
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

  async function handleBooking(){
    if (!user) {
      setMessage({ text: 'Please sign in to book this resort', type: 'error' })
      setTimeout(() => router.push('/auth/login'), 2000)
      return
    }

    if (!dateFrom || !dateTo) {
      setMessage({ text: 'Please select check-in and check-out dates', type: 'error' })
      return
    }

    if (new Date(dateFrom) >= new Date(dateTo)) {
      setMessage({ text: 'Check-out date must be after check-in date', type: 'error' })
      return
    }

    if (guests > resort.capacity) {
      setMessage({ text: `Maximum capacity is ${resort.capacity} guests`, type: 'error' })
      return
    }

    setBooking(true)
    setMessage(null)

    const { error } = await supabase.from('bookings').insert({
      resort_id: resort.id,
      guest_id: user.id,
      date_from: dateFrom,
      date_to: dateTo,
      guest_count: guests,
      status: 'pending'
    })

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Booking request sent! The owner will review your request.', type: 'success' })
      setDateFrom('')
      setDateTo('')
      setGuests(1)
    }

    setBooking(false)
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center">Loading resort...</div>
  if (!resort) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center">Resort not found</div>

  const nightlyRate = resort.price
  const nights = dateFrom && dateTo ? Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) : 0
  const totalCost = nights * nightlyRate

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-resort-50 to-white px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto">
        <Link href="/resorts" className="text-sm text-resort-500 font-semibold mb-6 inline-block hover:text-resort-600">
          ← Back to Resorts
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image */}
            <div className="relative h-96 bg-gradient-to-br from-resort-200 to-resort-300 rounded-2xl overflow-hidden mb-6 shadow-xl">
              {resort.image_url ? (
                <Image src={resort.image_url} alt={resort.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🏖️</div>
              )}
              <div className="absolute top-4 right-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-lg ${
                  resort.status === 'approved' ? 'bg-green-500 text-white' : 
                  resort.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {resort.status === 'approved' ? 'Available' : resort.status.charAt(0).toUpperCase() + resort.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Resort Info */}
            <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
              <h1 className="text-4xl font-bold text-resort-900 mb-4">{resort.name}</h1>
              <div className="flex items-center gap-2 text-lg text-slate-600 mb-6">
                <span>📍</span>
                <span>{resort.location}</span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-lg">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-sm text-slate-600">Price per night</p>
                    <p className="text-xl font-bold text-resort-900">₱{resort.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-lg">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-sm text-slate-600">Capacity</p>
                    <p className="text-xl font-bold text-resort-900">{resort.capacity} guests</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {resort.amenities && resort.amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-resort-900 mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {resort.amenities.map((amenity: string, idx: number) => (
                      <span key={idx} className="px-4 py-2 bg-resort-100 text-resort-800 rounded-lg text-sm font-medium">
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xl font-semibold text-resort-900 mb-3">About This Resort</h3>
                <p className="text-slate-700 leading-relaxed">{resort.description}</p>
              </div>
            </div>

            {/* Owner Info */}
            {owner && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-resort-900 mb-3">Hosted by</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-resort-100 rounded-full flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <p className="font-semibold text-resort-900">{owner.full_name}</p>
                    <p className="text-sm text-slate-600">{owner.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-xl sticky top-4">
              <h2 className="text-2xl font-bold text-resort-900 mb-6">Book Your Stay</h2>

              {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Check-in Date</label>
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Check-out Date</label>
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Guests</label>
                  <input 
                    type="number" 
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    min={1}
                    max={resort.capacity}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Maximum: {resort.capacity} guests</p>
                </div>
              </div>

              {nights > 0 && (
                <div className="bg-resort-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm text-slate-700 mb-2">
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
                className="w-full px-6 py-4 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {booking ? 'Booking...' : resort.status !== 'approved' ? 'Not Available' : 'Request to Book'}
              </button>

              <p className="text-xs text-slate-500 mt-3 text-center">
                You won&apos;t be charged yet. The owner will review your request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
