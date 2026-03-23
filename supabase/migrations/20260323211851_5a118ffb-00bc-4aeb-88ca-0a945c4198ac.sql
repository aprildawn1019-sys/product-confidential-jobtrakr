
-- Add status tracking and poster fields to jobs
ALTER TABLE public.jobs 
  ADD COLUMN status_updated_at timestamp with time zone DEFAULT now(),
  ADD COLUMN poster_name text,
  ADD COLUMN poster_email text,
  ADD COLUMN poster_phone text,
  ADD COLUMN poster_role text;

-- Junction table for manually linking contacts to jobs
CREATE TABLE public.job_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(job_id, contact_id)
);
ALTER TABLE public.job_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to job_contacts" ON public.job_contacts FOR ALL TO public USING (true) WITH CHECK (true);

-- Junction table for connections between contacts (LinkedIn, etc.)
CREATE TABLE public.contact_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id_1 uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_id_2 uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  connection_type text NOT NULL DEFAULT 'linkedin',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(contact_id_1, contact_id_2)
);
ALTER TABLE public.contact_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contact_connections" ON public.contact_connections FOR ALL TO public USING (true) WITH CHECK (true);
