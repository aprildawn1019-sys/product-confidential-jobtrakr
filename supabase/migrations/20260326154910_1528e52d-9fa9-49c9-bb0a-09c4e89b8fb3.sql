
CREATE TABLE public.job_skills_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT '{}',
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_skills_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snapshots" ON public.job_skills_snapshots
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
