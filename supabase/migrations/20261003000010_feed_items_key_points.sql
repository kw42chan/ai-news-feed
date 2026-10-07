ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS key_points text[];
