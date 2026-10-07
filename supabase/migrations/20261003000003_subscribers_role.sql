ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_role_check;

ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_role_check CHECK (
    role IS NULL OR role IN (
      'Marketing',
      'Sales',
      'Finance',
      'HR & People',
      'Operations',
      'Founder / Leadership',
      'Other'
    )
  );

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
  );
