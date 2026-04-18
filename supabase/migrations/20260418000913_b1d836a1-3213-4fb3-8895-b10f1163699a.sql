ALTER TABLE public.job_boards
  ADD COLUMN IF NOT EXISTS target_company_id uuid REFERENCES public.target_companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_boards_target_company_id
  ON public.job_boards (target_company_id);