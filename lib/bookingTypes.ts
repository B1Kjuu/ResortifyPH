// Booking Types for Philippine Resort Industry
// Supports daytour, overnight, and 22-hour bookings with flexible time slots

export type BookingType = 'daytour' | 'overnight' | '22hrs'

export type DayType = 'weekday' | 'weekend' // weekend includes holidays

export interface TimeSlot {
  id: string
  label: string
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  crossesMidnight: boolean // true if checkout is next day
  hours: number
  bookingType: BookingType
}

// Available time slots for each booking type
export const TIME_SLOTS: TimeSlot[] = [
  // Daytour slots (same day, no overnight)
  {
    id: 'daytour_8am_5pm',
    label: 'Daytour: 8:00 AM - 5:00 PM',
    startTime: '08:00',
    endTime: '17:00',
    crossesMidnight: false,
    hours: 9,
    bookingType: 'daytour',
  },
  {
    id: 'daytour_7am_5pm',
    label: 'Daytour: 7:00 AM - 5:00 PM',
    startTime: '07:00',
    endTime: '17:00',
    crossesMidnight: false,
    hours: 10,
    bookingType: 'daytour',
  },
  {
    id: 'daytour_9am_6pm',
    label: 'Daytour: 9:00 AM - 6:00 PM',
    startTime: '09:00',
    endTime: '18:00',
    crossesMidnight: false,
    hours: 9,
    bookingType: 'daytour',
  },
  
  // Overnight slots (evening to morning next day)
  {
    id: 'overnight_7pm_6am',
    label: 'Overnight: 7:00 PM - 6:00 AM',
    startTime: '19:00',
    endTime: '06:00',
    crossesMidnight: true,
    hours: 11,
    bookingType: 'overnight',
  },
  {
    id: 'overnight_6pm_6am',
    label: 'Overnight: 6:00 PM - 6:00 AM',
    startTime: '18:00',
    endTime: '06:00',
    crossesMidnight: true,
    hours: 12,
    bookingType: 'overnight',
  },
  {
    id: 'overnight_8pm_7am',
    label: 'Overnight: 8:00 PM - 7:00 AM',
    startTime: '20:00',
    endTime: '07:00',
    crossesMidnight: true,
    hours: 11,
    bookingType: 'overnight',
  },
  
  // 22-hour slots (extended stay, almost full day)
  {
    id: '22hrs_8am_6am',
    label: '22 Hours: 8:00 AM - 6:00 AM (+1 day)',
    startTime: '08:00',
    endTime: '06:00',
    crossesMidnight: true,
    hours: 22,
    bookingType: '22hrs',
  },
  {
    id: '22hrs_7pm_5pm',
    label: '22 Hours: 7:00 PM - 5:00 PM (+1 day)',
    startTime: '19:00',
    endTime: '17:00',
    crossesMidnight: true,
    hours: 22,
    bookingType: '22hrs',
  },
  {
    id: '22hrs_1pm_11am',
    label: '22 Hours: 1:00 PM - 11:00 AM (+1 day)',
    startTime: '13:00',
    endTime: '11:00',
    crossesMidnight: true,
    hours: 22,
    bookingType: '22hrs',
  },
  {
    id: '22hrs_2pm_12nn',
    label: '22 Hours: 2:00 PM - 12:00 NN (+1 day)',
    startTime: '14:00',
    endTime: '12:00',
    crossesMidnight: true,
    hours: 22,
    bookingType: '22hrs',
  },
]

export const BOOKING_TYPES: { id: BookingType; label: string; description: string }[] = [
  {
    id: 'daytour',
    label: 'Daytour',
    description: 'Same-day visit, typically 8-10 hours during daytime',
  },
  {
    id: 'overnight',
    label: 'Overnight',
    description: 'Evening to early morning, typically 11-12 hours',
  },
  {
    id: '22hrs',
    label: '22 Hours',
    description: 'Extended stay, almost full day including sleep over',
  },
]

// Guest tier structure for pricing
export interface GuestTier {
  id: string
  label: string
  minGuests: number
  maxGuests: number | null // null means unlimited
}

// Default guest tiers (owners can customize)
export const DEFAULT_GUEST_TIERS: GuestTier[] = [
  { id: 'tier_1', label: 'Up to 20 guests', minGuests: 1, maxGuests: 20 },
  { id: 'tier_2', label: '21-30 guests', minGuests: 21, maxGuests: 30 },
  { id: 'tier_3', label: '31-40 guests', minGuests: 31, maxGuests: 40 },
  { id: 'tier_4', label: '41+ guests', minGuests: 41, maxGuests: null },
]

// Pricing structure for a resort
export interface BookingPricing {
  bookingType: BookingType
  dayType: DayType
  guestTierId: string
  price: number
}

// Helper functions
export function getTimeSlotsForType(bookingType: BookingType): TimeSlot[] {
  return TIME_SLOTS.filter(slot => slot.bookingType === bookingType)
}

export function getTimeSlotById(slotId: string): TimeSlot | undefined {
  return TIME_SLOTS.find(slot => slot.id === slotId)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

// Philippine holidays (can be extended or fetched from API)
export const PHILIPPINE_HOLIDAYS: string[] = [
  // 2025 Holidays
  '2025-01-01', // New Year's Day
  '2025-01-29', // Chinese New Year
  '2025-02-25', // EDSA Revolution Anniversary
  '2025-04-09', // Araw ng Kagitingan
  '2025-04-17', // Maundy Thursday
  '2025-04-18', // Good Friday
  '2025-04-19', // Black Saturday
  '2025-05-01', // Labor Day
  '2025-06-12', // Independence Day
  '2025-08-21', // Ninoy Aquino Day
  '2025-08-25', // National Heroes Day
  '2025-11-01', // All Saints' Day
  '2025-11-02', // All Souls' Day
  '2025-11-30', // Bonifacio Day
  '2025-12-08', // Feast of the Immaculate Conception
  '2025-12-24', // Christmas Eve
  '2025-12-25', // Christmas Day
  '2025-12-30', // Rizal Day
  '2025-12-31', // New Year's Eve
  // 2026 Holidays
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year (estimated)
  '2026-02-25', // EDSA Revolution Anniversary
  '2026-04-02', // Maundy Thursday
  '2026-04-03', // Good Friday
  '2026-04-04', // Black Saturday
  '2026-04-09', // Araw ng Kagitingan
  '2026-05-01', // Labor Day
  '2026-06-12', // Independence Day
  '2026-08-21', // Ninoy Aquino Day
  '2026-08-31', // National Heroes Day
  '2026-11-01', // All Saints' Day
  '2026-11-02', // All Souls' Day
  '2026-11-30', // Bonifacio Day
  '2026-12-08', // Feast of the Immaculate Conception
  '2026-12-24', // Christmas Eve
  '2026-12-25', // Christmas Day
  '2026-12-30', // Rizal Day
  '2026-12-31', // New Year's Eve
]

// Legacy export for backwards compatibility
export const PHILIPPINE_HOLIDAYS_2025 = PHILIPPINE_HOLIDAYS.filter(d => d.startsWith('2025'))

export function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return PHILIPPINE_HOLIDAYS.includes(dateStr)
}

export function getDayType(date: Date): DayType {
  if (isWeekend(date) || isHoliday(date)) {
    return 'weekend'
  }
  return 'weekday'
}

export function getGuestTier(guestCount: number, tiers: GuestTier[] = DEFAULT_GUEST_TIERS): GuestTier | undefined {
  return tiers.find(tier => {
    if (guestCount >= tier.minGuests) {
      if (tier.maxGuests === null || guestCount <= tier.maxGuests) {
        return true
      }
    }
    return false
  })
}

// Calculate price based on booking parameters
export interface PriceCalculationParams {
  bookingType: BookingType
  date: Date
  guestCount: number
  pricing: BookingPricing[]
  guestTiers?: GuestTier[]
}

export function calculateBookingPrice(params: PriceCalculationParams): number | null {
  const { bookingType, date, guestCount, pricing, guestTiers = DEFAULT_GUEST_TIERS } = params
  
  const dayType = getDayType(date)
  const tier = getGuestTier(guestCount, guestTiers)
  
  if (!tier) return null
  
  const matchingPrice = pricing.find(p => 
    p.bookingType === bookingType && 
    p.dayType === dayType && 
    p.guestTierId === tier.id
  )
  
  return matchingPrice?.price ?? null
}

// Format time for display
export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Validate that a time slot doesn't conflict with existing bookings
export interface BookingSlot {
  date: string // YYYY-MM-DD
  timeSlotId: string
}

export function hasConflict(
  newSlot: BookingSlot, 
  existingBookings: BookingSlot[]
): boolean {
  const newTimeSlot = getTimeSlotById(newSlot.timeSlotId)
  if (!newTimeSlot) return false
  
  for (const existing of existingBookings) {
    if (existing.date !== newSlot.date) continue
    
    const existingTimeSlot = getTimeSlotById(existing.timeSlotId)
    if (!existingTimeSlot) continue
    
    // Same booking type on same day = conflict
    if (newTimeSlot.bookingType === existingTimeSlot.bookingType) {
      return true
    }
    
    // Daytour and overnight on same day = OK (different time ranges)
    // 22hrs conflicts with everything on same day
    if (newTimeSlot.bookingType === '22hrs' || existingTimeSlot.bookingType === '22hrs') {
      return true
    }
  }
  
  return false
}

// Default downpayment percentage
export const DEFAULT_DOWNPAYMENT_PERCENTAGE = 50

// Export combined pricing form structure
export interface ResortPricingConfig {
  enabledBookingTypes: BookingType[]
  enabledTimeSlots: string[] // slot IDs
  guestTiers: GuestTier[]
  pricing: BookingPricing[]
  downpaymentPercentage: number
}

export const DEFAULT_PRICING_CONFIG: ResortPricingConfig = {
  enabledBookingTypes: ['daytour', 'overnight', '22hrs'],
  enabledTimeSlots: ['daytour_8am_5pm', 'overnight_7pm_6am', '22hrs_8am_6am'],
  guestTiers: DEFAULT_GUEST_TIERS.slice(0, 2), // Default to first 2 tiers
  pricing: [],
  downpaymentPercentage: DEFAULT_DOWNPAYMENT_PERCENTAGE,
}
