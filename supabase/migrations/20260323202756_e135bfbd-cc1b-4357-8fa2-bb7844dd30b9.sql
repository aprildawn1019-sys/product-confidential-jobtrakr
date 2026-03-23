
-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  notes TEXT,
  last_contacted_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'remote' CHECK (type IN ('remote', 'hybrid', 'onsite')),
  salary TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  applied_date TEXT,
  notes TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('phone', 'technical', 'behavioral', 'onsite', 'final')),
  date TEXT NOT NULL,
  time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Allow public access (no auth yet)
CREATE POLICY "Allow all access to jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to interviews" ON public.interviews FOR ALL USING (true) WITH CHECK (true);

-- Seed demo data
INSERT INTO public.contacts (id, name, company, role, email, linkedin, last_contacted_at) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sarah Chen', 'Stripe', 'Engineering Manager', 'sarah@stripe.com', 'linkedin.com/in/sarachen', '2026-03-20'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Alex Rivera', 'Vercel', 'Senior Recruiter', 'alex@vercel.com', NULL, '2026-03-18'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'James Park', 'Linear', 'CTO', NULL, 'linkedin.com/in/jamespark', '2026-03-10'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Maria Santos', 'Figma', 'Design Lead', 'maria@figma.com', NULL, NULL);

INSERT INTO public.jobs (id, company, title, location, type, salary, status, applied_date, contact_id) VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Stripe', 'Senior Frontend Engineer', 'San Francisco, CA', 'hybrid', '$180k-$220k', 'interviewing', '2026-03-10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Vercel', 'Staff Engineer', 'Remote', 'remote', '$200k-$260k', 'applied', '2026-03-15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Linear', 'Full Stack Developer', 'Remote', 'remote', '$160k-$200k', 'screening', '2026-03-18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Figma', 'Product Engineer', 'New York, NY', 'hybrid', '$170k-$210k', 'saved', NULL, NULL),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Notion', 'Frontend Engineer', 'San Francisco, CA', 'onsite', '$165k-$195k', 'offer', '2026-02-20', NULL),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Datadog', 'Software Engineer', 'Boston, MA', 'hybrid', NULL, 'rejected', '2026-03-01', NULL);

INSERT INTO public.interviews (id, job_id, type, date, time, status, notes) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'technical', '2026-03-25', '2:00 PM', 'scheduled', 'System design round'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'phone', '2026-03-15', '10:00 AM', 'completed', 'Initial screen with Sarah'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'final', '2026-03-12', '11:00 AM', 'completed', 'VP of Engineering');
