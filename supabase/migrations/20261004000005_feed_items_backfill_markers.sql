ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS ai_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_regenerated_at timestamptz,
  ADD COLUMN IF NOT EXISTS story_grouped_at timestamptz;

CREATE INDEX IF NOT EXISTS feed_items_ai_classified_pending_idx
  ON public.feed_items (published_at ASC)
  WHERE ai_classified_at IS NULL AND summary IS NOT NULL AND source = 'youtube';

CREATE INDEX IF NOT EXISTS feed_items_summary_regen_pending_idx
  ON public.feed_items (published_at ASC)
  WHERE summary_regenerated_at IS NULL
    AND ai_classified_at IS NULL
    AND summary IS NOT NULL
    AND source = 'youtube';

CREATE INDEX IF NOT EXISTS feed_items_story_group_pending_idx
  ON public.feed_items (published_at ASC)
  WHERE story_grouped_at IS NULL
    AND hidden = false
    AND is_ai_related = true
    AND summary IS NOT NULL
    AND source = 'youtube';
