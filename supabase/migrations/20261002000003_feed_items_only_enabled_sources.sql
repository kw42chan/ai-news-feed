DROP POLICY IF EXISTS "Public can read visible feed items" ON public.feed_items;
CREATE POLICY "Public can read visible feed items" ON public.feed_items FOR SELECT TO anon, authenticated USING (hidden = false AND summary IS NOT NULL AND EXISTS (SELECT 1 FROM public.sources s WHERE s.id = feed_items.source_id AND s.enabled));
