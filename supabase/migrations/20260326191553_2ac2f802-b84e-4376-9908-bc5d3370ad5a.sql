
CREATE TABLE public.ai_feed_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'remote',
  salary text,
  url text,
  description text,
  skills text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_feed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai_feed_jobs"
  ON public.ai_feed_jobs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
