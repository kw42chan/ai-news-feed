ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS headline text;

COMMENT ON COLUMN public.feed_items.headline IS
  'Plain-English display headline (~8 words); group leads may summarize multiple videos.';
