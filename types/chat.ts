export type Chat = {
  id: string
  booking_id: string | null
  resort_id?: string | null
  status: 'open' | 'closed'
  created_at: string
  updated_at: string
}

export type ChatParticipant = {
  chat_id: string
  user_id: string
  role: 'guest' | 'owner' | 'admin'
  joined_at: string
}

export type ChatMessage = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}
