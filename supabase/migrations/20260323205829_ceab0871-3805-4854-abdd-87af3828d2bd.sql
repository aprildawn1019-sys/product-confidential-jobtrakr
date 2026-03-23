
CREATE TABLE public.job_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  url text,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  UNIQUE(name)
);

ALTER TABLE public.job_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to job_boards"
  ON public.job_boards FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Seed with common job boards for executive/product leadership roles
INSERT INTO public.job_boards (name, url, category, is_active) VALUES
  ('LinkedIn', 'https://linkedin.com/jobs', 'general', true),
  ('Indeed', 'https://indeed.com', 'general', true),
  ('Glassdoor', 'https://glassdoor.com', 'general', true),
  ('Company Workday Sites', null, 'ats', true),
  ('Lever/Greenhouse ATS', null, 'ats', true),
  ('Built In', 'https://builtin.com', 'tech', true),
  ('Hired', 'https://hired.com', 'tech', false),
  ('The Muse', 'https://themuse.com', 'general', false),
  ('Dice', 'https://dice.com', 'tech', false),
  ('Product Hunt Jobs', 'https://producthunt.com/jobs', 'product', false),
  ('Mind the Product', 'https://mindtheproduct.com/product-management-jobs', 'product', false),
  ('Chief', 'https://chief.com', 'executive', false),
  ('Riveter', 'https://theriveter.co', 'executive', false),
  ('ExecThread', 'https://execthread.com', 'executive', false),
  ('Ladders', 'https://theladders.com', 'executive', false),
  ('Wellfound (AngelList)', 'https://wellfound.com', 'startup', false),
  ('VentureLoop', 'https://ventureloop.com', 'startup', false),
  ('BioSpace', 'https://biospace.com', 'life_sciences', false),
  ('MedReps', 'https://medreps.com', 'life_sciences', false),
  ('HigherEdJobs', 'https://higheredjobs.com', 'education', false),
  ('Inside Higher Ed', 'https://insidehighered.com/careers', 'education', false),
  ('eFinancialCareers', 'https://efinancialcareers.com', 'finance', false);
