'use client'
import React, { useEffect, useRef, useState, useMemo } from 'react'
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
import BookingTypeSelector from '../../../components/BookingTypeSelector'
import TimeSlotCalendar from '../../../components/TimeSlotCalendar'
import { format } from 'date-fns'
import ChatLink from '../../../components/ChatLink'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { FiArrowLeft, FiMapPin, FiDollarSign, FiUsers, FiUser, FiTag, FiCheck, FiCalendar } from 'react-icons/fi'
import { FaUmbrellaBeach, FaStar } from 'react-icons/fa'
import { 
  BookingType, 
  getTimeSlotById, 
  getDayType, 
  getGuestTier,
  DEFAULT_DOWNPAYMENT_PERCENTAGE,
  AvailableTimeSlot,
} from '../../../lib/bookingTypes'
import type { ResortPricingConfig } from '../../../lib/validations'

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
  const [rawBookings, setRawBookings] = useState<Array<{ date_from: string; date_to: string; booking_type: string | null }>>([])
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [activeImage, setActiveImage] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  const [guests, setGuests] = useState(1)
  const [childrenCount, setChildrenCount] = useState(0)
  const [petsCount, setPetsCount] = useState(0)
  const [booking, setBooking] = useState(false)
  const [bookingType, setBookingType] = useState<BookingType>('daytour')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [selectedSingleDate, setSelectedSingleDate] = useState<Date | undefined>(undefined)
  const [stayType, setStayType] = useState<'day_12h' | 'overnight_22h'>('overnight_22h') // legacy fallback
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [quickExploreProvince, setQuickExploreProvince] = useState('')
  const [latestBookingId, setLatestBookingId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [eligibleReviewBookingId, setEligibleReviewBookingId] = useState<string | null>(null)
  // New state for advanced time-slot calendar
  const [useTimeSlotCalendar, setUseTimeSlotCalendar] = useState(false)
  const [dynamicPrice, setDynamicPrice] = useState<number | null>(null)
  const [dynamicPriceLoading, setDynamicPriceLoading] = useState(false)
  const [selectedDbSlotId, setSelectedDbSlotId] = useState<string | null>(null)
  const [resortTimeSlots, setResortTimeSlots] = useState<Array<{ slot_type: string; start_time: string; end_time: string }>>([])
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
        
        // Check if resort uses advanced pricing (database-backed time slots)
        if (resortData.use_advanced_pricing) {
          setUseTimeSlotCalendar(true)
        }

        // Fetch time slots for this resort (for cutoff times)
        const { data: timeSlotsData } = await supabase
          .from('resort_time_slots')
          .select('slot_type, start_time, end_time')
          .eq('resort_id', params.id)
          .eq('is_active', true)
        
        if (timeSlotsData && mounted) {
          setResortTimeSlots(timeSlotsData)
        }

        // Get owner info - with error handling
        if (resortData.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_admin, avatar_url')
            .eq('id', resortData.owner_id)
            .maybeSingle()
          
          if (!mounted) return

          if (ownerData) {
            setOwner(ownerData)
          }
        }

        // Get booked dates for this resort
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('date_from, date_to, status, booking_type')
          .eq('resort_id', params.id)
          .in('status', ['pending', 'confirmed'])

        if (bookingsData && mounted) {
          // Store bookings with their types for slot-aware availability
          // We'll compute bookedDates based on selected booking type in the UI
          setRawBookings(bookingsData.filter(b => b.status === 'confirmed'))
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

          // Fetch reviews for this resort (including images)
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('id, rating, title, content, created_at, guest_id, booking_id, images')
            .eq('resort_id', params.id)
            .order('created_at', { ascending: false })

          if (mounted) {
            setReviews(reviewsData || [])
            setLoading(false)
          }

          // Eligibility: completed confirmed booking without an existing review
          // For daytour bookings (single day), allow review on the same day after checkout
          const { data: completedBooking } = await supabase
            .from('bookings')
            .select('id, date_to')
            .eq('resort_id', params.id)
            .eq('guest_id', session.user.id)
            .eq('status', 'confirmed')
            .lte('date_to', new Date().toISOString().slice(0,10)) // Changed to lte to include same-day
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

  // Fetch dynamic price when using TimeSlotCalendar and a slot is selected
  useEffect(() => {
    async function fetchDynamicPrice() {
      if (!useTimeSlotCalendar || !selectedSingleDate || !selectedDbSlotId || !params.id) {
        setDynamicPrice(null)
        return
      }
      
      setDynamicPriceLoading(true)
      try {
        const dateStr = format(selectedSingleDate, 'yyyy-MM-dd')
        const response = await fetch(
          `/api/resorts/${params.id}/calculate-price?date=${dateStr}&slot_id=${selectedDbSlotId}&guest_count=${guests}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setDynamicPrice(data.totalPrice)
        } else {
          setDynamicPrice(null)
        }
      } catch (err) {
        console.error('Failed to fetch price:', err)
        setDynamicPrice(null)
      } finally {
        setDynamicPriceLoading(false)
      }
    }
    
    fetchDynamicPrice()
  }, [useTimeSlotCalendar, selectedSingleDate, selectedDbSlotId, guests, params.id])

  // Compute slot-aware booked dates based on selected booking type
  // - Daytour bookings only block other daytour bookings on the same date
  // - Overnight bookings only block other overnight bookings (can span 2 days)
  // - 22hrs bookings block the entire day
  // - Long stay bookings (3+ days) block all dates in range for all types
  const slotAwareBookedDates = useMemo(() => {
    if (!rawBookings.length) return []
    
    const blockedDates: string[] = []
    
    rawBookings.forEach(booking => {
      const start = new Date(booking.date_from)
      const end = new Date(booking.date_to)
      const startStr = format(start, 'yyyy-MM-dd')
      const endStr = format(end, 'yyyy-MM-dd')
      
      // Calculate days difference
      const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine if this is an overnight span (2 consecutive days)
      const isOvernightSpan = (
        (booking.booking_type === 'overnight' || booking.booking_type === 'overnight_22h') 
        && daysDiff === 1
      )
      
      // True multi-day: 3+ days, or 2 days that isn't an overnight span
      const isTrueMultiDay = daysDiff >= 2 || (daysDiff === 1 && !isOvernightSpan)
      
      // For true multi-day bookings, block all dates regardless of booking type
      if (isTrueMultiDay) {
        const current = new Date(start)
        while (current <= end) {
          blockedDates.push(format(current, 'yyyy-MM-dd'))
          current.setDate(current.getDate() + 1)
        }
        return
      }
      
      // For single-day bookings, check if it conflicts with selected booking type
      const existingType = booking.booking_type
      
      // 22hrs blocks everything on that day
      if (existingType === '22hrs') {
        blockedDates.push(startStr)
        return
      }
      
      // Handle overnight spans (2 days)
      if (isOvernightSpan) {
        // Overnight uses evening of start date and morning of end date
        if (bookingType === 'overnight') {
          // Block both dates for other overnight bookings
          blockedDates.push(startStr)
          blockedDates.push(endStr)
        }
        // Daytour doesn't conflict with overnight
        return
      }
      
      // Single-day slot booking
      // If user is booking the same type, block
      if (bookingType && existingType === bookingType) {
        blockedDates.push(startStr)
        return
      }
      
      // For legacy types, treat day_12h as daytour and overnight_22h as overnight
      if (existingType === 'day_12h' && bookingType === 'daytour') {
        blockedDates.push(startStr)
      } else if (existingType === 'overnight_22h' && bookingType === 'overnight') {
        blockedDates.push(startStr)
      }
    })
    
    return [...new Set(blockedDates)] // Remove duplicates
  }, [rawBookings, bookingType])

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

    // Date validation based on booking type
    const isDaytour = bookingType === 'daytour'
    
    if (isDaytour) {
      if (!selectedSingleDate) {
        toast.error('Please select a date for your daytour')
        return
      }
    } else {
      if (!selectedRange.from || !selectedRange.to) {
        toast.error('Please select check-in and check-out dates')
        return
      }
    }

    // Get the booking dates
    const bookingDateFrom = isDaytour ? selectedSingleDate! : selectedRange.from!
    const bookingDateTo = isDaytour ? selectedSingleDate! : selectedRange.to!

    // Guard against overlapping with already booked dates (confirmed bookings)
    // Use slotAwareBookedDates which considers booking type compatibility
    try {
      const chosen: string[] = []
      const start = new Date(bookingDateFrom)
      const end = new Date(bookingDateTo)
      const cursor = new Date(start)
      while (cursor <= end) {
        chosen.push(format(cursor, 'yyyy-MM-dd'))
        cursor.setDate(cursor.getDate() + 1)
      }
      const bookedSet = new Set(slotAwareBookedDates)
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
    
    // Get time slot details if selected (for legacy time slots)
    const timeSlotDetails = selectedTimeSlot ? getTimeSlotById(selectedTimeSlot) : null
    
    // Default times based on booking type (fallback if no time slot selected)
    const getDefaultTimes = (type: BookingType): { start: string; end: string } => {
      switch (type) {
        case 'daytour': return { start: '08:00', end: '17:00' }
        case 'overnight': return { start: '19:00', end: '06:00' }
        case '22hrs': return { start: '08:00', end: '06:00' }
        default: return { start: '08:00', end: '17:00' }
      }
    }
    const defaultTimes = getDefaultTimes(bookingType)
    
    // Determine which pricing mode to use
    const isAdvancedPricing = useTimeSlotCalendar && selectedDbSlotId && dynamicPrice
    const finalPrice = isAdvancedPricing ? dynamicPrice : totalCost
    const finalSlotId = isAdvancedPricing ? selectedDbSlotId : selectedTimeSlot
    
    // Use time slot times if available, otherwise use defaults based on booking type
    const checkInTime = timeSlotDetails?.startTime ?? defaultTimes.start
    const checkOutTime = timeSlotDetails?.endTime ?? defaultTimes.end

    let newId: string | null = null
    let error: any = null
    const rpcRes = await supabase.rpc('create_booking_safe', {
      p_resort_id: resort.id,
      p_guest_id: user.id,
      p_date_from: format(bookingDateFrom, 'yyyy-MM-dd'),
      p_date_to: format(bookingDateTo, 'yyyy-MM-dd'),
      p_guest_count: guests,
      p_resort_province: resort.location ?? null,
      p_resort_region_code: resort.region_code ?? provinceInfo?.regionCode ?? null,
      p_resort_region_name: resort.region_name ?? provinceInfo?.regionName ?? null,
      // New booking type fields
      p_booking_type: bookingType,
      p_time_slot_id: finalSlotId,
      p_check_in_time: checkInTime,
      p_check_out_time: checkOutTime,
      p_total_price: finalPrice,
      p_downpayment_amount: downpaymentAmount,
      // Legacy fields
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
          date_from: format(bookingDateFrom, 'yyyy-MM-dd'),
          date_to: format(bookingDateTo, 'yyyy-MM-dd'),
          guest_count: guests,
          booking_type: bookingType || null,
          time_slot_id: finalSlotId || null,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          total_price: finalPrice,
          downpayment_amount: downpaymentAmount,
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
      let friendly = error.message
      
      if (msg.includes('overlap') || msg.includes('check_violation')) {
        friendly = 'Your selected dates overlap with an existing booking.'
      } else if (msg.includes('duplicate_pending')) {
        friendly = 'You already have a pending booking request for this resort. Please wait for the owner to respond or cancel your existing request before making a new one.'
      } else if (msg.includes('self_booking') || msg.includes('own_resort')) {
        friendly = 'You cannot book your own resort.'
      }
      
      toast.error(friendly)
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
            const dateMessage = bookingType === 'daytour' && selectedSingleDate
              ? `on ${format(selectedSingleDate, 'MMM dd, yyyy')}`
              : selectedRange.from && selectedRange.to
                ? `from ${format(selectedRange.from, 'MMM dd, yyyy')} to ${format(selectedRange.to, 'MMM dd, yyyy')}`
                : ''
            await supabase.from('chat_messages').insert({
              chat_id: chat.id,
              sender_id: user.id,
              content: `Hi! I'd like to book ${resort.name} ${dateMessage} for ${guests} ${guests === 1 ? 'guest' : 'guests'}. Looking forward to hearing from you!`,
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

  // Pricing configuration
  const pricingConfig: ResortPricingConfig | null = resort.pricing_config || null
  const hasAdvancedPricing = pricingConfig?.pricing && pricingConfig.pricing.length > 0
  
  // Get selected date for pricing calculation
  const selectedDate = bookingType === 'daytour' ? selectedSingleDate : selectedRange.from
  
  // Calculate price based on new or legacy pricing
  const calculatePrice = (): number => {
    if (hasAdvancedPricing && selectedDate && bookingType) {
      const dayType = getDayType(selectedDate)
      const tier = getGuestTier(guests, pricingConfig!.guestTiers)
      if (tier) {
        const priceEntry = pricingConfig!.pricing.find(p =>
          p.bookingType === bookingType && p.dayType === dayType && p.guestTierId === tier.id
        )
        if (priceEntry) return priceEntry.price
      }
    }
    
    // Legacy pricing fallback
    if (bookingType === 'daytour') return resort.day_tour_price ?? resort.price ?? 0
    if (bookingType === 'overnight') return resort.night_tour_price ?? resort.price ?? 0
    if (bookingType === '22hrs') return resort.overnight_price ?? resort.price ?? 0
    
    // Fallback to stayType for backwards compatibility
    return stayType === 'day_12h' ? (resort.day_tour_price ?? resort.price) : (resort.overnight_price ?? resort.price)
  }
  
  const baseRate = calculatePrice()
  
  // Calculate nights/days count
  const nights = bookingType === 'daytour' 
    ? (selectedSingleDate ? 1 : 0)
    : (selectedRange.from && selectedRange.to ? Math.max(1, Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24))) : 0)
    
  const totalCost = baseRate * nights
  const downpaymentPercentage = pricingConfig?.downpaymentPercentage ?? DEFAULT_DOWNPAYMENT_PERCENTAGE
  const downpaymentAmount = Math.round((totalCost * downpaymentPercentage) / 100)

  function scrollToBookingCard(){
    const el = bookingCardRef.current
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
    <div className="w-full max-w-full min-h-screen bg-gradient-to-b from-resort-50 to-white pb-20 lg:pb-6 overflow-x-hidden">
      {/* Mobile Header - Fixed on mobile */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-3 py-3 flex items-center gap-2">
        <Link href="/resorts" className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition">
          <FiArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-900 truncate text-sm">{resort?.name || 'Resort'}</h1>
          <p className="text-xs text-slate-500 truncate">{resort?.location}</p>
        </div>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
            <FaStar className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-semibold text-slate-700">
              {Math.round((reviews.reduce((a,r)=>a+(r.rating||0),0)/reviews.length)*10)/10}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-10 pt-4 lg:pt-10 space-y-3 sm:space-y-6 w-full overflow-hidden">
        {/* Desktop back link */}
        <Link href="/resorts" className="hidden lg:inline-flex text-xs sm:text-sm text-resort-500 font-semibold items-center gap-1 hover:text-resort-600">
          <FiArrowLeft aria-hidden className="inline-block" /> Back to Resorts
        </Link>

        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-4 sm:gap-6 min-w-0">
          {/* Main Content */}
          <div className="space-y-4 min-w-0 overflow-hidden">
            {/* Gallery */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-card border border-slate-100 space-y-2 sm:space-y-3">
              {/* Main Image - Clickable */}
              <button
                type="button"
                onClick={() => galleryImages.length > 0 && setShowLightbox(true)}
                className="relative w-full h-[220px] sm:h-[320px] lg:h-[420px] rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-resort-200 to-resort-300 cursor-pointer group"
              >
                {galleryImages.length > 0 ? (
                  <>
                    <Image
                      src={galleryImages[activeImage]}
                      alt={resort.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(min-width: 1024px) 65vw, 100vw"
                      priority
                      unoptimized
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-slate-800 shadow-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        View all {galleryImages.length} photos
                      </div>
                    </div>
                    {/* Photo counter badge */}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {activeImage + 1} / {galleryImages.length}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl">
                    <FaUmbrellaBeach aria-hidden className="text-white/80" />
                  </div>
                )}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow ${
                    resort.status === 'approved' ? 'bg-green-500 text-white' : 
                    resort.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {resort.status === 'approved' ? 'Available' : resort.status.charAt(0).toUpperCase() + resort.status.slice(1)}
                  </span>
                </div>
              </button>

              {galleryImages.length > 1 && (
                <>
                  {/* Mobile: horizontal scroll thumbnails */}
                  <div className="sm:hidden flex gap-1.5 overflow-x-auto snap-x snap-mandatory py-1 scrollbar-hide">
                    {galleryImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(idx)}
                        className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border snap-start fade-in-up ${activeImage === idx ? 'border-resort-500 ring-2 ring-resort-200' : 'border-slate-200 hover:border-slate-300'}`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                        aria-label={`Show photo ${idx + 1}`}
                      >
                        <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="64px" unoptimized />
                      </button>
                    ))}
                  </div>
                  {/* Desktop: grid thumbnails - show all images */}
                  <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 gap-2">
                    {galleryImages.slice(0, 11).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(idx)}
                        className={`relative h-16 md:h-20 rounded-lg overflow-hidden border fade-in-up ${activeImage === idx ? 'border-resort-500 ring-2 ring-resort-200' : 'border-slate-200 hover:border-slate-300'}`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                        aria-label={`Show photo ${idx + 1}`}
                      >
                        <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="120px" unoptimized />
                      </button>
                    ))}
                    {/* Show more button if > 11 images */}
                    {galleryImages.length > 11 && (
                      <button
                        type="button"
                        onClick={() => setShowLightbox(true)}
                        className="relative h-16 md:h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center"
                        aria-label={`View all ${galleryImages.length} photos`}
                      >
                        <span className="text-sm font-semibold text-slate-600">+{galleryImages.length - 11}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Overview */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card border border-slate-100 space-y-4 sm:space-y-5">
              <div className="space-y-2">
                {/* Hide title on mobile since it's in the sticky header */}
                <h1 className="hidden lg:block text-xl sm:text-2xl lg:text-3xl font-bold text-resort-900">{resort.name}</h1>
                {/* Mobile-only compact title section */}
                <div className="lg:hidden">
                  <h1 className="text-lg font-bold text-resort-900 leading-tight">{resort.name}</h1>
                </div>
                {/* Average Rating Badge */}
                {reviews && reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 rounded-full">
                      <FaStar aria-hidden className="text-yellow-500 w-3.5 h-3.5" />
                      <span className="text-sm font-semibold text-slate-900">
                        {Math.round((reviews.reduce((a,r)=>a+(r.rating||0),0)/reviews.length)*10)/10}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FiMapPin aria-hidden className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{resort.location}</span>
                </div>
              </div>

              {/* Mobile: Horizontal scroll quick stats */}
              <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <div className="flex-shrink-0 flex items-center gap-2 bg-resort-50 px-3 py-2 rounded-xl">
                  <FiDollarSign aria-hidden className="text-resort-600 w-4 h-4" />
                  <div>
                    <p className="text-xs text-slate-600">Per night</p>
                    <p className="text-sm font-bold text-resort-900">₱{resort.price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 bg-resort-50 px-3 py-2 rounded-xl">
                  <FiUsers aria-hidden className="text-resort-600 w-4 h-4" />
                  <div>
                    <p className="text-xs text-slate-600">Capacity</p>
                    <p className="text-sm font-bold text-resort-900">{resort.capacity}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 bg-resort-50 px-3 py-2 rounded-xl">
                  <FiTag aria-hidden className="text-resort-600 w-4 h-4" />
                  <div>
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="text-sm font-bold text-resort-900">{resort.type || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Desktop: Grid stats */}
              <div className="hidden lg:grid grid-cols-3 gap-2 sm:gap-3">
                <div className="flex flex-col items-center gap-1 bg-resort-50 p-2.5 sm:p-4 rounded-xl text-center">
                  <FiDollarSign aria-hidden className="text-lg sm:text-xl text-resort-600" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-600">Per night</p>
                    <p className="text-sm sm:text-lg font-bold text-resort-900">₱{resort.price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 bg-resort-50 p-2.5 sm:p-4 rounded-xl text-center">
                  <FiUsers aria-hidden className="text-lg sm:text-xl text-resort-600" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-600">Capacity</p>
                    <p className="text-sm sm:text-lg font-bold text-resort-900">{resort.capacity} guests</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 bg-resort-50 p-2.5 sm:p-4 rounded-xl text-center">
                  <FiTag aria-hidden className="text-lg sm:text-xl text-resort-600" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-600">Type</p>
                    <p className="text-sm sm:text-lg font-bold text-resort-900">{resort.type || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Mobile: Compact Check-in/Contact section */}
              <div className="lg:hidden space-y-3">
                {owner && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    {owner.avatar_url ? (
                      <img 
                        src={owner.avatar_url} 
                        alt={owner.full_name || 'Host'} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-resort-100 flex items-center justify-center text-resort-600 font-semibold text-sm">
                        {owner.full_name?.[0]?.toUpperCase() || 'H'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{owner.full_name || 'Host'}</p>
                      <p className="text-xs text-slate-500">Resort Owner</p>
                    </div>
                    {latestBookingId ? (
                      <ChatLink bookingId={latestBookingId} as="guest" label="Chat" title={resort.name} variant="primary" />
                    ) : (
                      <ChatLink resortId={params.id} as="guest" label="Chat" title={resort.name} variant="primary" />
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Check-in / Check-out</p>
                    <p className="text-xs text-slate-600">{formatTime12h(resort.check_in_time || '14:00')} - {formatTime12h(resort.check_out_time || '12:00')}</p>
                  </div>
                  {latestBookingId ? (
                    <div className="flex-shrink-0">
                      <ChatLink bookingId={latestBookingId} as="guest" label="Chat" title={resort.name} variant="primary" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <ChatLink resortId={params.id} as="guest" label="Chat" title={resort.name} variant="primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: Full Check-in/Contact grid */}
              <div className="hidden lg:grid sm:grid-cols-2 gap-3 items-stretch">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Check-in / Check-out</p>
                  <p className="text-sm text-slate-600">Check-in: {formatTime12h(resort.check_in_time || '14:00')}</p>
                  <p className="text-sm text-slate-600">Check-out: {formatTime12h(resort.check_out_time || '12:00')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Contact</p>
                  {owner && (
                    <div className="flex items-center gap-3 pb-2">
                      {owner.avatar_url ? (
                        <img 
                          src={owner.avatar_url} 
                          alt={owner.full_name || 'Host'} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-resort-100 flex items-center justify-center text-resort-600 font-semibold text-sm">
                          {owner.full_name?.[0]?.toUpperCase() || 'H'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{owner.full_name || 'Host'}</p>
                        <p className="text-xs text-slate-500">Resort Owner</p>
                      </div>
                    </div>
                  )}
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
                <ReviewsList reviews={reviews} currentUserId={user?.id} />
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
                <p className="text-sm text-slate-700 leading-relaxed break-words">{resort.description}</p>
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
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-resort-100 rounded-full flex items-center justify-center text-lg">
                      <FiUser aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold text-resort-900">{owner.full_name}</p>
                      <p className="text-sm text-slate-600">Contact shared after booking</p>
                    </div>
                  </div>
                  
                  {/* Social Media & Website Links */}
                  {(resort.website_url || resort.facebook_url || resort.instagram_url) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      {resort.website_url && (
                        <a 
                          href={resort.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          Website
                        </a>
                      )}
                      {resort.facebook_url && (
                        <a 
                          href={resort.facebook_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </a>
                      )}
                      {resort.instagram_url && (
                        <a 
                          href={resort.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                          </svg>
                          Instagram
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Location Map */}
              {(resort.latitude && resort.longitude) || resort.address || resort.location ? (
                <div className="space-y-3 w-full overflow-hidden">
                  <h3 className="text-lg font-semibold text-resort-900 flex items-center gap-2">
                    <FiMapPin className="text-resort-500" />
                    Location
                  </h3>
                  
                  {/* Address Card - Show prominently above map */}
                  {(resort.address || resort.location) && (
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                      {resort.address && (
                        <p className="text-sm font-medium text-slate-800 flex items-start gap-2">
                          <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-resort-500" />
                          <span>{resort.address}</span>
                        </p>
                      )}
                      {resort.location && (
                        <p className="text-xs text-slate-500 mt-1 ml-6">
                          {resort.location}, Philippines
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl overflow-hidden border border-slate-200 w-full aspect-[4/3] sm:aspect-[16/9] relative group">
                    {resort.latitude && resort.longitude ? (
                      // Use Google Static Maps API for reliable map display
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${resort.latitude},${resort.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full relative"
                      >
                        {/* Google Static Maps - High quality, reliable */}
                        <img
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${resort.latitude},${resort.longitude}&zoom=15&size=800x450&scale=2&maptype=roadmap&markers=color:red%7C${resort.latitude},${resort.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`}
                          alt={`Map showing ${resort.name} location`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to a placeholder if Google Static Maps fails
                            const target = e.target as HTMLImageElement
                            target.onerror = null
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const fallback = document.createElement('div')
                              fallback.className = 'w-full h-full bg-gradient-to-br from-blue-50 to-green-50 flex flex-col items-center justify-center gap-2'
                              fallback.innerHTML = `
                                <svg class="w-12 h-12 text-resort-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <p class="text-sm font-medium text-slate-700">View on Google Maps</p>
                                <p class="text-xs text-slate-500">${resort.latitude.toFixed(4)}, ${resort.longitude.toFixed(4)}</p>
                              `
                              parent.appendChild(fallback)
                            }
                          }}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-slate-800 shadow-lg flex items-center gap-2">
                            <FiMapPin className="w-4 h-4" />
                            View on Google Maps
                          </div>
                        </div>
                      </a>
                    ) : (
                      // Fallback for address-only locations
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((resort.address || '') + ' ' + (resort.location || '') + ', Philippines')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-3 hover:from-slate-200 hover:to-slate-300 transition-colors"
                      >
                        <FiMapPin className="w-10 h-10 text-resort-500" />
                        <div className="text-center px-4">
                          <p className="text-sm font-medium text-slate-700">View location on map</p>
                        </div>
                        <span className="text-xs text-resort-600 font-medium">Tap to open Google Maps</span>
                      </a>
                    )}
                  </div>
                  {resort.latitude && resort.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${resort.latitude},${resort.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-resort-600 hover:text-resort-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in Google Maps
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((resort.address || '') + ' ' + (resort.location || '') + ', Philippines')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-resort-600 hover:text-resort-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in Google Maps
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div ref={bookingCardRef} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-card border border-slate-100 lg:sticky lg:top-4 space-y-3 sm:space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-resort-900">Book Your Stay</h2>
                <span className="text-xs sm:text-sm text-slate-500">Flexible dates</span>
              </div>

              {/* Unified Booking Type Selector - Always use button UI */}
              <BookingTypeSelector
                pricingConfig={pricingConfig}
                selectedBookingType={bookingType}
                selectedTimeSlot={selectedTimeSlot}
                selectedDate={selectedDate ?? null}
                guestCount={guests}
                onBookingTypeChange={(type) => {
                  setBookingType(type)
                  setSelectedTimeSlot(null)
                  // Reset ALL date selections when switching types to prevent glitches
                  setSelectedRange({ from: undefined, to: undefined })
                  setSelectedSingleDate(undefined)
                }}
                onTimeSlotChange={setSelectedTimeSlot}
                legacyPricing={{
                  day_tour_price: resort.day_tour_price,
                  night_tour_price: resort.night_tour_price,
                  overnight_price: resort.overnight_price,
                }}
              />

              {message && (
                <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    {useTimeSlotCalendar ? 'Select Date & Time Slot' : (bookingType === 'daytour' ? 'Select Date' : 'Select Dates')}
                  </label>
                  
                  {/* Toggle between calendar modes if resort has advanced pricing */}
                  {resort?.use_advanced_pricing && (
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUseTimeSlotCalendar(true)
                          setSelectedRange({ from: undefined, to: undefined })
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          useTimeSlotCalendar 
                            ? 'bg-resort-500 text-white border-resort-500' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-resort-300'
                        }`}
                      >
                        Time Slot Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseTimeSlotCalendar(false)
                          setSelectedDbSlotId(null)
                          setDynamicPrice(null)
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          !useTimeSlotCalendar 
                            ? 'bg-resort-500 text-white border-resort-500' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-resort-300'
                        }`}
                      >
                        Date Range
                      </button>
                    </div>
                  )}
                  
                  {/* TimeSlotCalendar for advanced pricing */}
                  {useTimeSlotCalendar ? (
                    <TimeSlotCalendar
                      resortId={params.id}
                      selectedDate={selectedSingleDate ?? null}
                      onSelectDate={(date) => {
                        setSelectedSingleDate(date)
                        setSelectedDbSlotId(null) // Reset slot when date changes
                      }}
                      selectedSlotId={selectedDbSlotId}
                      onSelectSlot={(slotId) => setSelectedDbSlotId(slotId)}
                      showSlotSelector={true}
                    />
                  ) : (
                    <DateRangePicker 
                      bookedDates={slotAwareBookedDates}
                      onSelectRange={setSelectedRange}
                      selectedRange={selectedRange}
                      singleDateMode={bookingType === 'daytour'}
                      onSelectSingleDate={setSelectedSingleDate}
                      selectedSingleDate={selectedSingleDate}
                      bookingType={bookingType}
                      checkInTime={resort?.check_in_time}
                      checkOutTime={resort?.check_out_time}
                      cutoffTime={resort?.check_in_time}
                      overnightStartTime={resortTimeSlots.find(s => s.slot_type === 'overnight')?.start_time}
                      twentyTwoHrsStartTime={resortTimeSlots.find(s => s.slot_type === '22hrs')?.start_time}
                    />
                  )}
                </div>

                {/* Guests, Children, Pets - All in one row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">Guests</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      min={1}
                      max={resort.capacity}
                      defaultValue={1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 1) {
                          const clamped = Math.min(val, resort.capacity)
                          setGuests(clamped)
                          // Also clamp the display value to prevent excessive digits
                          if (val > resort.capacity) {
                            e.target.value = String(clamped)
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value)
                        if (isNaN(val) || val < 1) {
                          e.target.value = '1'
                          setGuests(1)
                        } else if (val > resort.capacity) {
                          e.target.value = String(resort.capacity)
                          setGuests(resort.capacity)
                        }
                      }}
                      className="w-full px-2 sm:px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500 text-center text-lg font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-[10px] sm:text-xs text-slate-500">Max: {resort.capacity}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">Children</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      placeholder="0"
                      value={childrenCount === 0 ? '' : childrenCount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                        const val = raw === '' ? 0 : Math.min(99, parseInt(raw) || 0)
                        setChildrenCount(val)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') setChildrenCount(0)
                      }}
                      className="w-full px-2 sm:px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500 text-center text-lg font-medium placeholder:text-slate-400"
                    />
                    <p className="text-[10px] sm:text-xs text-slate-500">Under 13</p>
                  </div>
                  <div className="space-y-1">
                    <label className={`block text-xs sm:text-sm font-semibold ${resort?.amenities?.includes('Pet Friendly') ? 'text-slate-700' : 'text-slate-400 line-through'}`}>Pets</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      placeholder="0"
                      value={petsCount === 0 ? '' : petsCount}
                      onChange={(e) => {
                        if (!resort?.amenities?.includes('Pet Friendly')) return
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                        const val = raw === '' ? 0 : Math.min(20, parseInt(raw) || 0)
                        setPetsCount(val)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') setPetsCount(0)
                      }}
                      disabled={!resort?.amenities?.includes('Pet Friendly')}
                      className={`w-full px-2 sm:px-3 py-2.5 border rounded-lg focus:outline-none text-center text-lg font-medium placeholder:text-slate-400 ${
                        resort?.amenities?.includes('Pet Friendly') 
                          ? 'border-slate-300 focus:ring-2 focus:ring-resort-500' 
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                      }`}
                    />
                    <p className={`text-[10px] sm:text-xs ${resort?.amenities?.includes('Pet Friendly') ? 'text-slate-500' : 'text-red-400'}`}>
                      {resort?.amenities?.includes('Pet Friendly') ? 'Pets welcome' : 'Not pet-friendly'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing display - Dynamic for TimeSlotCalendar, calculated for legacy */}
              {useTimeSlotCalendar && selectedSingleDate && selectedDbSlotId ? (
                <div className="bg-resort-50 rounded-lg p-3 space-y-2">
                  {dynamicPriceLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin h-5 w-5 border-2 border-resort-500 border-t-transparent rounded-full" />
                      <span className="ml-2 text-sm text-slate-600">Calculating price...</span>
                    </div>
                  ) : dynamicPrice ? (
                    <>
                      <div className="flex justify-between text-sm text-slate-700">
                        <span>Selected time slot</span>
                        <span>₱{dynamicPrice.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-resort-200 pt-2 flex justify-between font-bold text-resort-900">
                        <span>Total</span>
                        <span>₱{dynamicPrice.toLocaleString()}</span>
                      </div>
                      {downpaymentPercentage > 0 && downpaymentPercentage < 100 && (
                        <div className="border-t border-resort-200 pt-2 flex justify-between text-sm text-resort-700">
                          <span>Downpayment ({downpaymentPercentage}%)</span>
                          <span className="font-semibold">₱{Math.round(dynamicPrice * downpaymentPercentage / 100).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">
                      Price not available for this combination
                    </p>
                  )}
                </div>
              ) : nights > 0 && (
                <div className="bg-resort-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>₱{baseRate.toLocaleString()} × {nights} {bookingType === 'daytour' ? 'day' : `night${nights > 1 ? 's' : ''}`}</span>
                    <span>₱{totalCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-resort-200 pt-2 flex justify-between font-bold text-resort-900">
                    <span>Total</span>
                    <span>₱{totalCost.toLocaleString()}</span>
                  </div>
                  {downpaymentPercentage > 0 && downpaymentPercentage < 100 && (
                    <div className="border-t border-resort-200 pt-2 flex justify-between text-sm text-resort-700">
                      <span>Downpayment ({downpaymentPercentage}%)</span>
                      <span className="font-semibold">₱{downpaymentAmount.toLocaleString()}</span>
                    </div>
                  )}
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
    {/* Mobile sticky action bar - Improved design */}
    {resort?.status === 'approved' && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full px-3 py-3 flex items-center gap-2">
          {/* Price info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-resort-900">₱{baseRate?.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">{bookingType === 'daytour' ? '/day' : '/night'}</span>
            </div>
            {nights > 0 && totalCost > 0 && (
              <p className="text-[10px] text-slate-600 truncate">
                Total: <span className="font-semibold text-resort-700">₱{totalCost.toLocaleString()}</span>
              </p>
            )}
          </div>
          {/* Book button */}
          <button
            onClick={scrollToBookingCard}
            className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-resort-600 hover:to-resort-700 active:scale-[0.98] transition-all"
          >
            Book Now
          </button>
        </div>
      </div>
    )}

    {/* Image Lightbox Modal */}
    {showLightbox && galleryImages.length > 0 && (
      <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white">
          <span className="font-medium">{activeImage + 1} / {galleryImages.length}</span>
          <button
            onClick={() => setShowLightbox(false)}
            className="p-2 hover:bg-white/10 rounded-full transition"
            aria-label="Close gallery"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Main Image */}
        <div className="flex-1 flex items-center justify-center px-4 relative">
          {/* Previous button */}
          <button
            onClick={() => setActiveImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
            className="absolute left-2 sm:left-4 p-2 sm:p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full transition text-white z-10 touch-manipulation"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="relative w-full max-w-5xl h-[60vh] sm:h-[70vh]">
            <Image
              src={galleryImages[activeImage]}
              alt={`${resort.name} - Photo ${activeImage + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              unoptimized
            />
          </div>
          
          {/* Next button */}
          <button
            onClick={() => setActiveImage((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
            className="absolute right-2 sm:right-4 p-2 sm:p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full transition text-white z-10 touch-manipulation"
            aria-label="Next image"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Thumbnail strip */}
        <div className="p-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 justify-center">
            {galleryImages.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`relative flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition ${
                  activeImage === idx 
                    ? 'ring-2 ring-white opacity-100' 
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="80px" unoptimized />
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
