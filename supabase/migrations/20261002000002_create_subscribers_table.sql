-- Create subscribers table for email digest signups
-- RLS: anon/authenticated can INSERT only (no select/update/delete)

CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'site'
);

-- Create unique index on lowercase email for case-insensitive deduplication
CREATE UNIQUE INDEX subscribers_email_lower_idx ON public.subscribers (lower(email));

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to INSERT only
-- Check: email matches basic email pattern and length <= 254
CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND length(email) <= 254
  );

-- No SELECT/UPDATE/DELETE policies - list is not readable from client
