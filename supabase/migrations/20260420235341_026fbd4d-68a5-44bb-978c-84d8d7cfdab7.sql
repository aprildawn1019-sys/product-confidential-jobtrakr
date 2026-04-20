-- 1. Table
CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own resume_versions"
ON public.resume_versions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Only one primary per user (partial unique index)
CREATE UNIQUE INDEX resume_versions_one_primary_per_user
ON public.resume_versions (user_id)
WHERE is_primary = true;

-- 4. Helpful index for listing
CREATE INDEX resume_versions_user_updated_idx
ON public.resume_versions (user_id, updated_at DESC);

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER resume_versions_touch_updated_at
BEFORE UPDATE ON public.resume_versions
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 6. Auto-demote previous primary when a new one is set
-- (avoids the partial-unique-index conflict during a single statement)
CREATE OR REPLACE FUNCTION public.demote_other_primary_resumes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.resume_versions
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resume_versions_demote_other_primary
BEFORE INSERT OR UPDATE OF is_primary ON public.resume_versions
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.demote_other_primary_resumes();