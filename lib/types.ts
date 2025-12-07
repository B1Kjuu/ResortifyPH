// Type definitions for ResortifyPH

export interface Profile {
  id: string
  full_name?: string
  role: 'guest' | 'owner'
  is_admin?: boolean
  created_at?: string
}

export interface Resort {
  id: string
  owner_id: string
  name: string
  description?: string
  location: string
  price: number
  capacity?: number
  amenities?: string[]
  images?: string[]
  status: 'pending' | 'approved' | 'rejected'
  created_at?: string
}

export interface Booking {
  id: string
  resort_id: string
  guest_id: string
  date_from: string
  date_to: string
  status: 'pending' | 'confirmed' | 'rejected'
  created_at?: string
}

export interface ResortWithProfile extends Resort {
  profiles?: Profile
}

export interface BookingWithDetails extends Booking {
  resorts?: Resort
  profiles?: Profile
}
