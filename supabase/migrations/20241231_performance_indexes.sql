-- Performance Indexes Migration
-- Date: 2024-12-31
-- Description: Add indexes to improve query performance for high traffic

-- Resort indexes
CREATE INDEX IF NOT EXISTS idx_resorts_status ON public.resorts(status);
CREATE INDEX IF NOT EXISTS idx_resorts_status_approved ON public.resorts(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_resorts_location ON public.resorts(location);
CREATE INDEX IF NOT EXISTS idx_resorts_owner ON public.resorts(owner_id);
CREATE INDEX IF NOT EXISTS idx_resorts_created ON public.resorts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resorts_price ON public.resorts(price);
CREATE INDEX IF NOT EXISTS idx_resorts_type ON public.resorts(type);

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_resort_id ON public.bookings(resort_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON public.bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_status ON public.bookings(resort_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_dates ON public.bookings(resort_id, date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_status ON public.bookings(guest_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings(created_at DESC);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chats_booking_id ON public.chats(booking_id);
CREATE INDEX IF NOT EXISTS idx_chats_resort_id ON public.chats(resort_id);
CREATE INDEX IF NOT EXISTS idx_chats_creator_id ON public.chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON public.chats(updated_at DESC);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON public.chat_messages(chat_id, created_at DESC);

-- Chat participants indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON public.chat_participants(chat_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_resort ON public.reviews(resort_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guest ON public.reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_resort_created ON public.reviews(resort_id, created_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_resort ON public.favorites(resort_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_resort ON public.favorites(user_id, resort_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resorts_approved_created ON public.resorts(created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed_dates ON public.bookings(resort_id, date_from, date_to) WHERE status = 'confirmed';

-- Analyze tables to update query planner statistics
ANALYZE public.resorts;
ANALYZE public.bookings;
ANALYZE public.chats;
ANALYZE public.chat_messages;
ANALYZE public.notifications;
ANALYZE public.reviews;
ANALYZE public.favorites;
ANALYZE public.profiles;
