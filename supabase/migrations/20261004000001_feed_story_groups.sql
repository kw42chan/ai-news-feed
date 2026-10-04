ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS story_group_id uuid REFERENCES public.feed_items (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_story_lead boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS feed_items_story_group_id_idx
  ON public.feed_items (story_group_id)
  WHERE story_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS feed_items_story_lead_published_idx
  ON public.feed_items (is_story_lead, published_at DESC)
  WHERE hidden = false;

COMMENT ON COLUMN public.feed_items.story_group_id IS 'Lead item id for grouped coverage; null = solo story';
COMMENT ON COLUMN public.feed_items.is_story_lead IS 'True for the card shown in the feed for this story group';
