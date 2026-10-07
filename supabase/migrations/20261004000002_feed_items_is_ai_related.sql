ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS is_ai_related boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS feed_items_public_ai_idx
  ON public.feed_items (published_at DESC)
  WHERE hidden = false AND is_ai_related = true AND summary IS NOT NULL;

-- Previously hidden as not relevant; treat as non-AI for public surfaces (rows stay in DB).
UPDATE public.feed_items
SET is_ai_related = false
WHERE hidden = true AND summary IS NULL;
