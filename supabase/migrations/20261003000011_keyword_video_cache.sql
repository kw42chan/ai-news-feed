CREATE TABLE public.keyword_video_cache (
  keyword text PRIMARY KEY,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_video_cache ENABLE ROW LEVEL SECURITY;
