'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'
import { getProvinceInfo } from '../../../lib/locations'
import ReviewsList from '../../../components/ReviewsList'
import ReviewForm from '../../../components/ReviewForm'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import DateRangePicker from '../../../components/DateRangePicker'
import LocationCombobox from '../../../components/LocationCombobox'
import { format } from 'date-fns'
import ChatLink from '../../../components/ChatLink'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { FiArrowLeft, FiMapPin, FiDollarSign, FiUsers, FiUser, FiTag, FiCheck } from 'react-icons/fi'
import { FaUmbrellaBeach, FaStar } from 'react-icons/fa'

export default function ResortDetail({ params }: { params: { id: string } }){
  function formatTime12h(t?: string | null) {
    try {
      if (!t) return '—'
      const parts = String(t).split(':')
      const h = parseInt(parts[0] || '0', 10)
      const m = parseInt(parts[1] || '0', 10)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hr12 = ((h + 11) % 12) + 1
      const mm = Number.isFinite(m) ? String(m).padStart(2, '0') : '00'
      return `${hr12}:${mm} ${ampm}`
    } catch {
      return String(t || '—')
    }
  }
  const [resort, setResort] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [activeImage, setActiveImage] = useState(0)
  const [guests, setGuests] = useState(1)
  const [childrenCount, setChildrenCount] = useState(0)
  const [petsCount, setPetsCount] = useState(0)
  const [booking, setBooking] = useState(false)
  const [stayType, setStayType] = useState<'day_12h' | 'overnight_22h'>('overnight_22h')
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [quickExploreProvince, setQuickExploreProvince] = useState('')
  const [latestBookingId, setLatestBookingId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [eligibleReviewBookingId, setEligibleReviewBookingId] = useState<string | null>(null)
  const bookingCardRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  // Scroll reveal for in-view sections
  useEffect(() => {
    if (typeof window === 'undefined') return
    const elements = Array.from(document.querySelectorAll('.reveal'))
    if (elements.length === 0) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view')
        }
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
    elements.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

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
          .select('date_from, date_to, status')
          .eq('resort_id', params.id)
          .in('status', ['pending', 'confirmed'])

        if (bookingsData && mounted) {
          // Only mark CONFIRMED bookings as unavailable (pending bookings don't block dates)
          const allBookedDates: string[] = []
          bookingsData.forEach(booking => {
            // Skip pending bookings - only confirmed ones block the calendar
            if (booking.status !== 'confirmed') return
            
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
          // If the signed-in user has a booking for this resort, show chat button
          const { data: latestBooking } = await supabase
            .from('bookings')
            .select('id')
            .eq('resort_id', params.id)
            .eq('guest_id', session.user.id)
            .in('status', ['pending', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          setLatestBookingId(latestBooking?.id || null)

          // Fetch reviews for this resort
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('id, rating, title, content, created_at, guest_id, booking_id')
            .eq('resort_id', params.id)
            .order('created_at', { ascending: false })

          if (mounted) {
            setReviews(reviewsData || [])
            setLoading(false)
          }

          // Eligibility: completed confirmed booking without an existing review
          const { data: completedBooking } = await supabase
            .from('bookings')
            .select('id, date_to')
            .eq('resort_id', params.id)
            .eq('guest_id', session.user.id)
            .eq('status', 'confirmed')
            .lt('date_to', new Date().toISOString().slice(0,10))
            .order('date_to', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (completedBooking?.id) {
            const { data: existing } = await supabase
              .from('reviews')
              .select('id')
              .eq('booking_id', completedBooking.id)
              .eq('guest_id', session.user.id)
              .limit(1)
            setEligibleReviewBookingId((existing && existing.length > 0) ? null : completedBooking.id)
          }
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

  // Realtime-sync booked dates for this resort (confirmed bookings only)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    async function refreshBookedDates() {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('date_from, date_to, status')
        .eq('resort_id', params.id)
        .in('status', ['pending', 'confirmed'])
      
      const allBookedDates: string[] = []
      ;(bookingsData || []).forEach(booking => {
        if (booking.status !== 'confirmed') return
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

    const sub = supabase
      .channel(`resort_bookings_${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `resort_id=eq.${params.id}` }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { refreshBookedDates() }, 250)
      })
      .subscribe()
    return () => { sub.unsubscribe(); if (timer) clearTimeout(timer) }
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

    // Prevent owners from booking their own resort
    if (user?.id && resort?.owner_id && user.id === resort.owner_id) {
      toast.error('Owners cannot book their own resort')
      return
    }

    if (!selectedRange.from || !selectedRange.to) {
      toast.error('Please select check-in and check-out dates')
      return
    }

    // Enforce same-day for Day Tour (12h)
    if (stayType === 'day_12h') {
      const sameDay = format(selectedRange.from, 'yyyy-MM-dd') === format(selectedRange.to, 'yyyy-MM-dd')
      if (!sameDay) {
        toast.error('Day Tour must start and end on the same day')
        return
      }
    }

    // Guard against overlapping with already booked dates (confirmed bookings)
    try {
      const chosen: string[] = []
      const start = new Date(selectedRange.from)
      const end = new Date(selectedRange.to)
      const cursor = new Date(start)
      while (cursor <= end) {
        chosen.push(format(cursor, 'yyyy-MM-dd'))
        cursor.setDate(cursor.getDate() + 1)
      }
      const bookedSet = new Set(bookedDates)
      const overlaps = chosen.some(d => bookedSet.has(d))
      if (overlaps) {
        toast.error('Selected dates overlap with an existing confirmed booking')
        return
      }
    } catch {}

    if (guests < 1) {
      toast.error('At least 1 guest required')
      return
    }
    const totalPeople = guests + Math.max(0, childrenCount)
    if (totalPeople > resort.capacity) {
      toast.error(`Capacity exceeded: ${totalPeople}/${resort.capacity} (adults + children)`) 
      return
    }

    setBooking(true)
    toast.loading('Creating booking...')

    const provinceInfo = getProvinceInfo(resort?.location)

    let newId: string | null = null
    let error: any = null
    const rpcRes = await supabase.rpc('create_booking_safe', {
      p_resort_id: resort.id,
      p_guest_id: user.id,
      p_date_from: format(selectedRange.from, 'yyyy-MM-dd'),
      p_date_to: format(selectedRange.to, 'yyyy-MM-dd'),
      p_guest_count: guests,
      p_resort_province: resort.location ?? null,
      p_resort_region_code: resort.region_code ?? provinceInfo?.regionCode ?? null,
      p_resort_region_name: resort.region_name ?? provinceInfo?.regionName ?? null,
      // optional: pass stay type if RPC handles it (ignored otherwise)
      p_stay_type: stayType,
      p_children_count: childrenCount,
      p_pets_count: petsCount,
    })
    newId = (rpcRes as any)?.data ?? null
    error = (rpcRes as any)?.error ?? null

    // Fallback: if function is missing, insert booking directly
    if (error && String(error?.message || '').includes('Could not find the function')) {
      // Double-check self-booking in fallback
      if (user?.id && resort?.owner_id && user.id === resort.owner_id) {
        toast.error('Owners cannot book their own resort')
        return
      }
      const { data: ins, error: insErr } = await supabase
        .from('bookings')
        .insert({
          resort_id: resort.id,
          guest_id: user.id,
          date_from: format(selectedRange.from, 'yyyy-MM-dd'),
          date_to: format(selectedRange.to, 'yyyy-MM-dd'),
          guest_count: guests,
          children_count: childrenCount,
          pets_count: petsCount,
          status: 'pending',
        })
        .select('id')
        .single()
      if (insErr) {
        error = insErr
      } else {
        newId = (ins as any)?.id ?? null
        error = null
      }
    }

    setBooking(false)
    toast.dismiss()

    if (error) {
      const msg = (error.message || '').toLowerCase()
      const friendly = msg.includes('overlap') || msg.includes('check_violation')
        ? 'Your selected dates overlap with an existing booking.'
        : error.message
      toast.error(`Error: ${friendly}`)
    } else {
      // Create chat and send automatic welcome message
      if (newId) {
        try {
          // Create chat for this booking
          const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({
              booking_id: newId,
              creator_id: user.id,
            })
            .select('id')
            .single()

          if (!chatError && chat) {
            // Add guest as participant
            await supabase.from('chat_participants').insert({
              chat_id: chat.id,
              user_id: user.id,
              role: 'guest',
            })

            // Add owner as participant
            await supabase.from('chat_participants').insert({
              chat_id: chat.id,
              user_id: resort.owner_id,
              role: 'owner',
            })

            // Send automatic welcome message to notify owner
            await supabase.from('chat_messages').insert({
              chat_id: chat.id,
              sender_id: user.id,
              content: `Hi! I'd like to book ${resort.name} from ${format(selectedRange.from, 'MMM dd, yyyy')} to ${format(selectedRange.to, 'MMM dd, yyyy')} for ${guests} ${guests === 1 ? 'guest' : 'guests'}. Looking forward to hearing from you!`,
            })
            // Notify owner for booking-created message
            try {
              await fetch('/api/notifications/chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: newId, resortId: resort.id, senderUserId: user.id, content: 'New booking request message' }),
              })
            } catch {}
            // Add system guidance message (acts like a pinned note)
            await supabase.from('chat_messages').insert({
              chat_id: chat.id,
              sender_id: user.id,
              content: '📌 System: Coordinate payment in chat; share payment details and receipt here.'
            })

            // Fire owner notification email for new booking request
            try {
              if (owner?.email) {
                await fetch('/api/notifications/booking-status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: owner.email,
                    status: 'created',
                    resortName: resort.name,
                    dateFrom: format(selectedRange.from!, 'yyyy-MM-dd'),
                    dateTo: format(selectedRange.to!, 'yyyy-MM-dd'),
                    link: `/chat/${newId}?as=owner`,
                    userId: owner.id,
                  })
                })
              }
            } catch (notifyErr) {
              console.warn('Notify owner (created) failed:', notifyErr)
            }
          }
        } catch (chatSetupError) {
          console.error('Chat setup error:', chatSetupError)
          // Don't block booking success if chat fails
        }
      }

      toast.success('Booking request sent! Opening chat…')
      setSelectedRange({ from: undefined, to: undefined })
      setGuests(1)
      // Navigate to booking chat for immediate messaging
      if (newId) {
        router.push(`/chat/${newId}?as=guest`)
      }
    }
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-10 py-10 text-center">Loading resort...</div>
  if (!resort) return <div className="w-full px-4 sm:px-6 lg:px-10 py-10 text-center">Resort not found</div>

  const galleryImages = resort.images && resort.images.length > 0
    ? resort.images
    : resort.image_url
      ? [resort.image_url]
      : []

  const baseRate = stayType === 'day_12h' ? (resort.day_tour_price ?? resort.price) : (resort.overnight_price ?? resort.price)
  const nights = selectedRange.from && selectedRange.to ? Math.max(1, Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const totalCost = baseRate * nights

  function scrollToBookingCard(){
    const el = bookingCardRef.current
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
    <div className="w-full min-h-screen bg-gradient-to-b from-resort-50 to-white px-4 sm:px-6 lg:px-10 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/resorts" className="text-sm text-resort-500 font-semibold inline-flex items-center gap-1 hover:text-resort-600">
          <FiArrowLeft aria-hidden className="inline-block" /> Back to Resorts
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
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    <FaUmbrellaBeach aria-hidden className="text-white/80" />
                  </div>
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
                <>
                  {/* Mobile: horizontal scroll thumbnails */}
                  <div className="sm:hidden flex gap-2 overflow-x-auto snap-x snap-mandatory py-1">
                    {galleryImages.slice(0, 8).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(idx)}
                        className={`relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border snap-start fade-in-up ${activeImage === idx ? 'border-resort-500 ring-2 ring-resort-200' : 'border-slate-200'}`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                        aria-label={`Show photo ${idx + 1}`}
                      >
                        <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="96px" />
                      </button>
                    ))}
                  </div>
                  {/* Desktop: grid thumbnails */}
                  <div className="hidden sm:grid grid-cols-5 gap-2">
                    {galleryImages.slice(0, 5).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(idx)}
                        className={`relative h-18 rounded-lg overflow-hidden border fade-in-up ${activeImage === idx ? 'border-resort-500 ring-2 ring-resort-200' : 'border-slate-200'}`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                        aria-label={`Show photo ${idx + 1}`}
                      >
                        <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="120px" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-resort-900">{resort.name}</h1>
                {/* Average Rating Badge */}
                {reviews && reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <FaStar aria-hidden className="text-yellow-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        {Math.round((reviews.reduce((a,r)=>a+(r.rating||0),0)/reviews.length)*10)/10}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-base text-slate-600">
                  <FiMapPin aria-hidden />
                  <span>{resort.location}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <FiDollarSign aria-hidden className="text-xl" />
                  <div>
                    <p className="text-xs text-slate-600">Price per night</p>
                    <p className="text-lg font-bold text-resort-900">₱{resort.price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <FiUsers aria-hidden className="text-xl" />
                  <div>
                    <p className="text-xs text-slate-600">Capacity</p>
                    <p className="text-lg font-bold text-resort-900">{resort.capacity} guests</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-resort-50 p-4 rounded-xl">
                  <FiTag aria-hidden className="text-xl" />
                  <div>
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="text-lg font-bold text-resort-900">{resort.type || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-stretch">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Check-in / Check-out</p>
                  <p className="text-sm text-slate-600">Check-in: {formatTime12h(resort.check_in_time || '14:00')}</p>
                  <p className="text-sm text-slate-600">Check-out: {formatTime12h(resort.check_out_time || '12:00')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Contact</p>
                  <p className="text-sm text-slate-600">{resort.contact_number || 'Owner will share after booking'}</p>
                  {resort.nearby_landmarks && <p className="text-sm text-slate-600">Nearby: {resort.nearby_landmarks}</p>}
                  {latestBookingId && (
                    <div className="pt-2">
                      <ChatLink bookingId={latestBookingId} as="guest" label="Message Host" title={resort.name} variant="primary" fullWidth />
                    </div>
                  )}

                  {!latestBookingId && (
                    <div className="pt-2">
                      <ChatLink resortId={params.id} as="guest" label="Message Host (Pre-booking)" title={resort.name} variant="primary" fullWidth />
                    </div>
                  )}
                  {!latestBookingId && (
                    <p className="text-xs text-slate-500 pt-1">Chat becomes available after you request to book.</p>
                  )}
                </div>
              </div>

              {/* Reviews Section - moved below grid to reduce tall right column whitespace */}
              <div className="space-y-5">
                {user && eligibleReviewBookingId && (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-sm font-semibold">You’re eligible to review this resort based on your recent stay.</p>
                    <a href="#review-form" className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Write a review</a>
                  </div>
                )}
                <ReviewsList reviews={reviews} />
                {user && eligibleReviewBookingId ? (
                  <div id="review-form">
                    <ReviewForm
                      resortId={params.id}
                      bookingId={eligibleReviewBookingId}
                      onSubmitted={async () => {
                        const { data: reviewsData } = await supabase
                          .from('reviews')
                          .select('id, rating, title, content, created_at, guest_id, booking_id')
                          .eq('resort_id', params.id)
                          .order('created_at', { ascending: false })
                        setReviews(reviewsData || [])
                        setEligibleReviewBookingId(null)

                        // Notify owner of new review
                        try {
                          const latest = (reviewsData || [])[0]
                          if (owner?.email && latest) {
                            await fetch('/api/notifications/review-submitted', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                to: owner.email,
                                resortName: resort.name,
                                rating: latest.rating,
                                comment: latest.title ? `${latest.title} — ${latest.content}` : latest.content,
                                link: `/resorts/${params.id}#reviews`,
                                userId: owner.id,
                              })
                            })
                          }
                        } catch (notifyErr) {
                          console.warn('Notify owner (review) failed:', notifyErr)
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm text-slate-700">Only guests who completed a confirmed stay can write a review.</p>
                  </div>
                )}
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
                      <span key={idx} className="px-3 py-1.5 bg-resort-100 text-resort-800 rounded-lg text-xs font-medium fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                        <FiCheck aria-hidden className="inline-block mr-1 align-middle" /> {amenity}
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
                  <div className="w-10 h-10 bg-resort-100 rounded-full flex items-center justify-center text-lg">
                    <FiUser aria-hidden />
                  </div>
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
            <div ref={bookingCardRef} className="bg-white rounded-2xl p-5 shadow-md border border-slate-100 lg:sticky lg:top-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-resort-900">Book Your Stay</h2>
                <span className="text-sm text-slate-500">Flexible dates</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Stay Type</label>
                <div className="mt-1">
                  {/* Styled select for stay type/time */}
                  <div className="relative">
                    <select value={stayType} onChange={(e) => setStayType(e.target.value as any)} className="appearance-none w-full px-3 py-2 h-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400 bg-white pr-9">
                      <option value="day_12h">Day Tour (12 hours, same-day)</option>
                      <option value="overnight_22h">Overnight (22 hours)</option>
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Pricing uses {stayType === 'day_12h' ? 'Day Tour' : 'Overnight'} rate when available.</p>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700">Children</label>
                    <input
                      type="number"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                    />
                    <p className="text-xs text-slate-500">Count ages under 13</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700">Pets</label>
                    <input
                      type="number"
                      value={petsCount}
                      onChange={(e) => setPetsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                    />
                    <p className="text-xs text-slate-500">If allowed; fees may apply</p>
                  </div>
                </div>
              </div>

              {nights > 0 && (
                <div className="bg-resort-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>₱{baseRate.toLocaleString()} × {nights} {stayType === 'day_12h' ? 'day' : `night${nights > 1 ? 's' : ''}`}</span>
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

              <DisclaimerBanner className="mt-3" />

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
    {/* Mobile sticky action bar */}
    {resort?.status === 'approved' && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur border-t border-slate-200 fade-in-up">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="font-bold text-resort-900">₱{baseRate?.toLocaleString()}</p>
                      <p className="text-xs text-slate-600">{stayType === 'day_12h' ? 'per day' : 'per night'}</p>
            </div>
            {nights > 0 && (
              <div className="text-xs text-slate-700">
                <span className="font-semibold">{nights}</span> night{nights > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <button
            onClick={scrollToBookingCard}
            className="px-5 py-2.5 bg-resort-600 text-white rounded-xl font-semibold shadow hover:bg-resort-700"
          >
            Request to Book
          </button>
        </div>
      </div>
    )}
    </>
  )
}
