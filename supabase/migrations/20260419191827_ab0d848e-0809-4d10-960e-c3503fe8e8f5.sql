ALTER TABLE public.recommendation_requests
  ADD COLUMN IF NOT EXISTS job_id uuid NULL,
  ADD COLUMN IF NOT EXISTS target_company_id uuid NULL,
  ADD COLUMN IF NOT EXISTS due_date text NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_job_id
  ON public.recommendation_requests(job_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_target_company_id
  ON public.recommendation_requests(target_company_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_user_status
  ON public.recommendation_requests(user_id, status);