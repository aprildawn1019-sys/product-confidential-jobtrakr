-- Outreaches: trackable efforts to secure an inside referral
CREATE TABLE public.outreaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  target_company_id UUID NOT NULL REFERENCES public.target_companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'identified',
  outcome TEXT,
  goal TEXT,
  notes TEXT,
  referral_asked_at TEXT,
  referral_made_at TEXT,
  next_step_date TEXT,
  next_step_label TEXT,
  closed_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outreaches_stage_check CHECK (stage IN ('identified','contacted','in_conversation','referral_asked','referral_made','closed')),
  CONSTRAINT outreaches_outcome_check CHECK (outcome IS NULL OR outcome IN ('won','lost'))
);

CREATE INDEX idx_outreaches_user ON public.outreaches(user_id);
CREATE INDEX idx_outreaches_contact ON public.outreaches(contact_id);
CREATE INDEX idx_outreaches_target_company ON public.outreaches(target_company_id);
CREATE INDEX idx_outreaches_job ON public.outreaches(job_id);
CREATE INDEX idx_outreaches_stage ON public.outreaches(user_id, stage);

ALTER TABLE public.outreaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own outreaches"
ON public.outreaches FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own outreaches"
ON public.outreaches FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.target_companies tc WHERE tc.id = target_company_id AND tc.user_id = auth.uid())
  AND (job_id IS NULL OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.user_id = auth.uid()))
);

CREATE POLICY "Users update own outreaches"
ON public.outreaches FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.target_companies tc WHERE tc.id = target_company_id AND tc.user_id = auth.uid())
  AND (job_id IS NULL OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.user_id = auth.uid()))
);

CREATE POLICY "Users delete own outreaches"
ON public.outreaches FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Auto-update updated_at on row change
CREATE TRIGGER outreaches_touch_updated_at
BEFORE UPDATE ON public.outreaches
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();