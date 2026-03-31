CREATE TABLE public.job_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'other',
  activity_date text NOT NULL,
  contact_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job_activities"
  ON public.job_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());