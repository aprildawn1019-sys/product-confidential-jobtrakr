ALTER TABLE public.contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.interviews ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.job_contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.contact_connections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.dismissed_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.job_search_profile ALTER COLUMN user_id SET NOT NULL;