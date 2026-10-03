CREATE TABLE public.keyword_video_daily_quota (
  day date PRIMARY KEY,
  uncached_searches int NOT NULL DEFAULT 0
);

ALTER TABLE public.keyword_video_daily_quota ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.keyword_video_daily_quota FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_keyword_video_daily_quota(p_day date)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.keyword_video_daily_quota AS q (day, uncached_searches)
  VALUES (p_day, 1)
  ON CONFLICT (day) DO UPDATE
  SET uncached_searches = q.uncached_searches + 1
  RETURNING q.uncached_searches;
$$;

REVOKE ALL ON FUNCTION public.increment_keyword_video_daily_quota(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_keyword_video_daily_quota(date) TO service_role;
