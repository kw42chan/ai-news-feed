ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS feed_items_roles_idx ON public.feed_items USING gin (roles);
