
-- Add user_id to all tables
ALTER TABLE public.jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.interviews ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_contacts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contact_connections ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dismissed_jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_boards ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_search_profile ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add cover_letters table
CREATE TABLE public.cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow all access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all access to interviews" ON public.interviews;
DROP POLICY IF EXISTS "Allow all access to job_contacts" ON public.job_contacts;
DROP POLICY IF EXISTS "Allow all access to contact_connections" ON public.contact_connections;
DROP POLICY IF EXISTS "Allow all access to dismissed_jobs" ON public.dismissed_jobs;
DROP POLICY IF EXISTS "Allow all access to job_boards" ON public.job_boards;
DROP POLICY IF EXISTS "Allow all access to job_search_profile" ON public.job_search_profile;

-- Create proper RLS policies for each table
CREATE POLICY "Users manage own jobs" ON public.jobs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own contacts" ON public.contacts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own interviews" ON public.interviews FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own job_contacts" ON public.job_contacts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own contact_connections" ON public.contact_connections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own dismissed_jobs" ON public.dismissed_jobs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own job_boards" ON public.job_boards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own job_search_profile" ON public.job_search_profile FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own cover_letters" ON public.cover_letters FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
