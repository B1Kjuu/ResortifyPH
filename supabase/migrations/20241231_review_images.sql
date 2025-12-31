-- Add images column to reviews table for photo uploads (up to 4)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Create index for reviews with images
CREATE INDEX IF NOT EXISTS idx_reviews_has_images ON public.reviews((array_length(images, 1) > 0)) WHERE array_length(images, 1) > 0;
