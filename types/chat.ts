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
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
}

export type MessageReaction = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export type TypingStatus = {
  chat_id: string
  user_id: string
  updated_at: string
}

export type UserPresence = {
  user_id: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

export type UserProfile = {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  email?: string | null
}
