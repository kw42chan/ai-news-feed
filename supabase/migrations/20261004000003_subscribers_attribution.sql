ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text;

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_utm_source_len;

ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_utm_source_len CHECK (utm_source IS NULL OR length(utm_source) <= 200);

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_utm_medium_len;

ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_utm_medium_len CHECK (utm_medium IS NULL OR length(utm_medium) <= 200);

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_utm_campaign_len;

ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_utm_campaign_len CHECK (utm_campaign IS NULL OR length(utm_campaign) <= 200);

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_referrer_len;

ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_referrer_len CHECK (referrer IS NULL OR length(referrer) <= 500);

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;

CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND length(email) <= 254
    AND (
      role IS NULL OR role IN (
        'Marketing',
        'Sales',
        'Finance',
        'HR & People',
        'Operations',
        'Founder / Leadership',
        'Other'
      )
    )
    AND (utm_source IS NULL OR length(utm_source) <= 200)
    AND (utm_medium IS NULL OR length(utm_medium) <= 200)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 200)
    AND (referrer IS NULL OR length(referrer) <= 500)
  );
