ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

CREATE INDEX IF NOT EXISTS feed_items_enriched_at_null_idx
  ON public.feed_items (published_at DESC)
  WHERE enriched_at IS NULL AND hidden = false AND summary IS NOT NULL;
