import { z } from 'zod'

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

// Auth validations
export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
})

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Resort validations
export const resortSchema = z.object({
  name: z.string().min(5, 'Resort name must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  address: z.string().max(500, 'Address must be under 500 characters').optional().nullable(),
  type: z.enum(['beach', 'mountain', 'nature', 'city', 'countryside'], {
    message: 'Please select a resort type',
  }),
  price: pesoField('Base price', { min: 500, max: 1_000_000 }),
  day_tour_price: pesoField('Day tour price', { required: false, min: 500, max: 1_000_000 }),
  night_tour_price: pesoField('Night tour price', { required: false, min: 500, max: 1_000_000 }),
  overnight_price: pesoField('Overnight price', { required: false, min: 500, max: 1_000_000 }),
  additional_guest_fee: pesoField('Additional guest fee', { required: false, min: 0, max: 100_000 }),
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
  house_rules: z.string().max(2000, 'House rules must be under 2000 characters').optional().nullable(),
  cancellation_policy: z.enum(['flexible', 'moderate', 'strict', 'no_refund']),
  pool_size: z.string().max(120, 'Pool size description too long').optional().nullable(),
  pool_depth: z.string().max(120, 'Pool depth description too long').optional().nullable(),
  has_pool_heating: z.boolean().default(false),
  has_jacuzzi: z.boolean().default(false),
  parking_slots: countField('Parking slots', { required: false, min: 0, max: 50 }),
  nearby_landmarks: z.string().max(500, 'Nearby landmarks must be under 500 characters').optional().nullable(),
  bring_own_items: z.string().max(500, 'Bring your own items note must be under 500 characters').optional().nullable(),
})

// Booking validations
export const bookingSchema = z.object({
  date_from: z.string().min(1, 'Check-in date is required'),
  date_to: z.string().min(1, 'Check-out date is required'),
  guest_count: z.number().min(1, 'At least 1 guest required').max(100, 'Too many guests'),
}).refine((data) => {
  const from = new Date(data.date_from)
  const to = new Date(data.date_to)
  return to > from
}, {
  message: 'Check-out date must be after check-in date',
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
