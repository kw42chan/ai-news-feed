-- Add hidden column to feed_items for filtering out low-relevance or unsummarized content
-- This allows cleaner filtering in the frontend query

ALTER TABLE public.feed_items ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS feed_items_hidden_idx ON public.feed_items (hidden) WHERE hidden = false;

-- Mark existing low-relevance items as hidden
UPDATE public.feed_items SET hidden = true WHERE summary = '(filtered as low-relevance)';

-- Update RLS policy to exclude hidden items from public view
DROP POLICY IF EXISTS "Public can read feed items" ON public.feed_items;
CREATE POLICY "Public can read visible feed items" ON public.feed_items 
  FOR SELECT TO anon, authenticated 
  USING (hidden = false AND summary IS NOT NULL);
