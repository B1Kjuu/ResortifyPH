import { z } from 'zod'
import { BookingType, DayType, GuestTier, BookingPricing, TIME_SLOTS } from './bookingTypes'

const pesoField = (
  label: string,
  { required = true, min, max }: { required?: boolean; min: number; max?: number }
) => {
  let schema = z
    .number({
      message: `${label} must be a valid number`,
    })
    .min(min, `${label} must be at least ₱${min.toLocaleString()}`)
  if (typeof max === 'number') {
    schema = schema.max(max, `${label} must not exceed ₱${max.toLocaleString()}`)
  }
  return required ? schema : schema.optional().nullable()
}

const countField = (
  label: string,
  { required = true, min, max }: { required?: boolean; min: number; max?: number }
) => {
  let schema = z
    .number({
      message: `${label} must be a valid number`,
    })
    .min(min, `${label} must be at least ${min}`)
  if (typeof max === 'number') {
    schema = schema.max(max, `${label} must not exceed ${max}`)
  }
  return required ? schema : schema.optional().nullable()
}

// Booking type enum
const bookingTypeEnum = z.enum(['daytour', 'overnight', '22hrs'])

// Day type enum (weekday vs weekend/holiday)
const dayTypeEnum = z.enum(['weekday', 'weekend'])

// Guest tier schema
const guestTierSchema = z.object({
  id: z.string(),
  label: z.string(),
  minGuests: z.number().min(1),
  maxGuests: z.number().nullable(),
})

// Pricing entry schema
const bookingPricingSchema = z.object({
  bookingType: bookingTypeEnum,
  dayType: dayTypeEnum,
  guestTierId: z.string(),
  price: z.number().min(0),
})

// Custom time slot schema
const customTimeSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  bookingType: bookingTypeEnum,
})

// Resort pricing configuration schema
export const resortPricingConfigSchema = z.object({
  enabledBookingTypes: z.array(bookingTypeEnum).min(1, 'At least one booking type must be enabled'),
  enabledTimeSlots: z.array(z.string()).min(1, 'At least one time slot must be enabled'),
  customTimeSlots: z.array(customTimeSlotSchema).optional().default([]),
  guestTiers: z.array(guestTierSchema).min(1, 'At least one guest tier is required'),
  pricing: z.array(bookingPricingSchema),
  downpaymentPercentage: z.number().min(0).max(100).default(50),
})

// Auth validations
export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^((\+63|0)?9\d{9})$/, 'Invalid Philippine mobile number (e.g., 09171234567 or +639171234567)')
})

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Resort validations
export const resortSchema = z.object({
  name: z.string().min(5, 'Resort name must be at least 5 characters'),
  // Description: strip HTML tags and control chars, then trim
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .transform((s) => s.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim()),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  address: z.string().max(500, 'Address must be under 500 characters').optional().nullable(),
  type: z.enum(['beach', 'mountain', 'nature', 'city', 'countryside', 'staycation', 'private', 'villa', 'glamping', 'farmstay', 'spa'], {
    message: 'Please select a resort type',
  }),
  // Legacy pricing fields (kept for backwards compatibility)
  price: pesoField('Base price', { required: false, min: 500, max: 1_000_000 }),
  day_tour_price: pesoField('Day tour price', { required: false, min: 500, max: 1_000_000 }),
  night_tour_price: pesoField('Night tour price', { required: false, min: 500, max: 1_000_000 }),
  overnight_price: pesoField('Overnight price', { required: false, min: 500, max: 1_000_000 }),
  additional_guest_fee: pesoField('Additional guest fee', { required: false, min: 0, max: 100_000 }),
  // New tiered pricing configuration
  pricing_config: resortPricingConfigSchema.optional().nullable(),
  capacity: countField('Guest capacity', { min: 1, max: 150 }),
  bedrooms: countField('Bedrooms', { required: false, min: 0, max: 50 }),
  bathrooms: countField('Bathrooms', { required: false, min: 0, max: 50 }),
  amenities: z.array(z.string()).max(30, 'You can pick up to 30 amenities').default([]),
  images: z.array(z.string()).default([]),
  contact_number: z
    .string()
    .regex(/^(\+63|0)?9\d{9}$/, 'Invalid Philippine mobile number (e.g., 09171234567 or +639171234567)'),
  check_in_time: z.string().min(1, 'Check-in time is required'),
  check_out_time: z.string().min(1, 'Check-out time is required'),
  house_rules: z.string().max(2000, 'House rules must be under 2000 characters').optional().nullable().transform((s) => (s ? s.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : s)),
  cancellation_policy: z.enum(['flexible', 'moderate', 'strict', 'no_refund']),
  pool_size: z.string().max(120, 'Pool size description too long').optional().nullable(),
  pool_depth: z.string().max(120, 'Pool depth description too long').optional().nullable(),
  has_pool_heating: z.boolean().default(false),
  has_jacuzzi: z.boolean().default(false),
  parking_slots: countField('Parking slots', { required: false, min: 0, max: 50 }),
  nearby_landmarks: z.string().max(500, 'Nearby landmarks must be under 500 characters').optional().nullable().transform((s) => (s ? s.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : s)),
  bring_own_items: z.string().max(500, 'Bring your own items note must be under 500 characters').optional().nullable().transform((s) => (s ? s.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : s)),
  // Verification-related optional fields - more details = better approval chances
  registration_number: z.string().max(120).optional().nullable().transform((s) => (s?.trim() || null)),
  dti_sec_certificate_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  business_permit_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  gov_id_owner_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  website_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  facebook_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  instagram_url: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  contact_email_verified: z.boolean().default(false),
  contact_phone_verified: z.boolean().default(false),
  location_verified: z.boolean().default(false),
  verification_notes: z.string().max(2000).optional().nullable().transform((s) => (s ? s.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : s)),
})

// Booking validations
export const bookingSchema = z.object({
  date_from: z.string().min(1, 'Check-in date is required'),
  date_to: z.string().min(1, 'Check-out date is required'),
  guest_count: z.number().min(1, 'At least 1 guest required').max(150, 'Too many guests'),
  // New booking type fields
  booking_type: bookingTypeEnum.optional(), // daytour, overnight, 22hrs
  time_slot_id: z.string().optional(), // e.g., 'daytour_8am_5pm'
  check_in_time: z.string().optional(), // HH:mm format
  check_out_time: z.string().optional(), // HH:mm format
  // Pricing at time of booking
  total_price: z.number().min(0).optional(),
  downpayment_amount: z.number().min(0).optional(),
  day_type: dayTypeEnum.optional(), // weekday or weekend
  guest_tier_id: z.string().optional(),
}).refine((data) => {
  const from = new Date(data.date_from)
  const to = new Date(data.date_to)
  // For same-day bookings (daytour), from and to can be the same
  if (data.booking_type === 'daytour') {
    return to >= from
  }
  return to >= from // Allow same day for overnight that ends next day
}, {
  message: 'Check-out date must be on or after check-in date',
  path: ['date_to'],
})

// Profile validations
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ResortInput = z.infer<typeof resortSchema>
export type BookingInput = z.infer<typeof bookingSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type ResortPricingConfig = z.infer<typeof resortPricingConfigSchema>
