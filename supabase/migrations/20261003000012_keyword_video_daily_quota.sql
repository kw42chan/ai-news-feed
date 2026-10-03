CREATE TABLE public.keyword_video_daily_quota (
  day date PRIMARY KEY,
  uncached_searches int NOT NULL DEFAULT 0
);

ALTER TABLE public.keyword_video_daily_quota ENABLE ROW LEVEL SECURITY;
