
CREATE TABLE public.dismissed_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company text NOT NULL,
  title text NOT NULL,
  UNIQUE(company, title)
);

ALTER TABLE public.dismissed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dismissed_jobs"
  ON public.dismissed_jobs FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
