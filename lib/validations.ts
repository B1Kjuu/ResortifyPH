import { z } from 'zod'

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
  location: z.string().min(5, 'Location must be at least 5 characters'),
  type: z.enum(['beach', 'mountain', 'nature', 'city', 'countryside'], {
    message: 'Please select a resort type',
  }),
  price: z.number().min(500, 'Price must be at least ₱500').max(1000000, 'Price too high'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  bedrooms: z.number().min(1, 'Must have at least 1 bedroom').max(50, 'Too many bedrooms'),
  bathrooms: z.number().min(1, 'Must have at least 1 bathroom').max(50, 'Too many bathrooms'),
  contact_number: z.string()
    .regex(/^(\+63|0)?9\d{9}$/, 'Invalid Philippine mobile number (e.g., 09171234567 or +639171234567)'),
  check_in_time: z.string().min(1, 'Check-in time is required'),
  check_out_time: z.string().min(1, 'Check-out time is required'),
  house_rules: z.string().optional(),
  cancellation_policy: z.string().optional(),
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
