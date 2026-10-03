CREATE OR REPLACE FUNCTION public.trending_keywords(days int DEFAULT 7, max_count int DEFAULT 12)
RETURNS TABLE(keyword text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT kw AS keyword, COUNT(*)::bigint AS count
  FROM public.feed_items fi
  CROSS JOIN LATERAL unnest(fi.keywords) AS kw
  WHERE fi.hidden = false
    AND fi.summary IS NOT NULL
    AND fi.source = 'youtube'
    AND fi.published_at >= (now() - make_interval(days => days))
    AND EXISTS (
      SELECT 1
      FROM public.sources s
      WHERE s.id = fi.source_id
        AND s.enabled
    )
    AND kw IS NOT NULL
    AND btrim(kw) <> ''
  GROUP BY kw
  ORDER BY count DESC, keyword ASC
  LIMIT GREATEST(max_count, 0);
$$;

REVOKE ALL ON FUNCTION public.trending_keywords(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trending_keywords(int, int) TO anon, authenticated;
