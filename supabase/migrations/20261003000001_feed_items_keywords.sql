ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS feed_items_keywords_idx ON public.feed_items USING gin (keywords);
