export type PaymentMethod = 'gcash' | 'bank_transfer' | 'maya' | 'other'

export type PaymentTemplate = {
  id: string
  owner_id: string
  name: string
  payment_method: PaymentMethod
  account_name: string
  account_number: string
  bank_name?: string | null
  additional_notes?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type PaymentSubmissionStatus = 'pending' | 'verified' | 'rejected'

export type PaymentSubmission = {
  id: string
  booking_id: string
  chat_id?: string | null
  submitted_by: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string | null
  receipt_url?: string | null
  notes?: string | null
  status: PaymentSubmissionStatus
  verified_by?: string | null
  verified_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export type BookingPaymentStatus = 'unpaid' | 'pending' | 'verified' | 'partial'

// Helper type for displaying payment info
export type PaymentMethodInfo = {
  id: PaymentMethod
  label: string
  icon: string
  color: string
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { id: 'gcash', label: 'GCash', icon: '📱', color: '#007DFE' },
  { id: 'maya', label: 'Maya', icon: '💚', color: '#00B140' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', color: '#1e40af' },
  { id: 'other', label: 'Other', icon: '💳', color: '#6b7280' },
]
