CREATE OR REPLACE VIEW public.feed_story_leads
WITH (security_invoker = true) AS
SELECT
  fi.*,
  grp.video_count AS story_video_count
FROM public.feed_items fi
INNER JOIN (
  SELECT
    COALESCE(f.story_group_id, f.id) AS group_key,
    COUNT(*)::int AS video_count
  FROM public.feed_items f
  WHERE f.hidden = false
    AND f.is_ai_related = true
    AND f.summary IS NOT NULL
    AND f.source = 'youtube'
  GROUP BY COALESCE(f.story_group_id, f.id)
) grp ON grp.group_key = COALESCE(fi.story_group_id, fi.id)
WHERE fi.is_story_lead = true
  AND fi.hidden = false
  AND fi.is_ai_related = true
  AND fi.summary IS NOT NULL
  AND fi.source = 'youtube';

GRANT SELECT ON public.feed_story_leads TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.trending_keywords(days int DEFAULT 7, max_count int DEFAULT 12)
RETURNS TABLE(keyword text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (array_agg(kw ORDER BY kw))[1] AS keyword,
    COUNT(*)::bigint AS count
  FROM public.feed_items fi
  CROSS JOIN LATERAL unnest(fi.keywords) AS kw
  WHERE fi.hidden = false
    AND fi.is_ai_related = true
    AND fi.is_story_lead = true
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
  GROUP BY lower(btrim(kw))
  ORDER BY count DESC, keyword ASC
  LIMIT GREATEST(max_count, 0);
$$;

REVOKE ALL ON FUNCTION public.trending_keywords(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trending_keywords(int, int) TO anon, authenticated;
