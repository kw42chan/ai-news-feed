ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS headline text;

ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS headline_attempts smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.feed_items.headline IS
  'Plain-English display headline (~8 words); group leads may summarize multiple videos.';

COMMENT ON COLUMN public.feed_items.headline_attempts IS
  'Failed headline generations (LLM or post-check); stop retrying after 2.';

-- fi.* was expanded when the view was first created; recreate so headline is included.
DROP VIEW IF EXISTS public.feed_story_leads;

CREATE VIEW public.feed_story_leads
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
