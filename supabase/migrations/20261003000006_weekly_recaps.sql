CREATE TABLE public.weekly_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  title text NOT NULL,
  intro text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read weekly recaps" ON public.weekly_recaps
  FOR SELECT TO anon, authenticated
  USING (true);
