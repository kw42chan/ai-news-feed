ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS enrich_attempts int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS feed_items_enriched_at_null_idx
  ON public.feed_items (published_at DESC)
  WHERE enriched_at IS NULL
    AND hidden = false
    AND summary IS NOT NULL
    AND enrich_attempts < 3;
