ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS try_this text;
