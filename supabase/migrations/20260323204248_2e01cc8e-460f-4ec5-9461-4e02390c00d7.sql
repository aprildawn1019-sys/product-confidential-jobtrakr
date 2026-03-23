
CREATE TABLE public.job_search_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  target_roles text[] NOT NULL DEFAULT '{}',
  locations text[] NOT NULL DEFAULT '{}',
  remote_preference text NOT NULL DEFAULT 'open',
  min_base_salary integer,
  compensation_notes text,
  must_haves text[] NOT NULL DEFAULT '{}',
  dealbreakers text[] NOT NULL DEFAULT '{}',
  nice_to_haves text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  summary text,
  resume_text text
);

ALTER TABLE public.job_search_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to job_search_profile"
  ON public.job_search_profile FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Seed with April's profile data
INSERT INTO public.job_search_profile (
  target_roles,
  locations,
  remote_preference,
  min_base_salary,
  compensation_notes,
  must_haves,
  dealbreakers,
  nice_to_haves,
  industries,
  skills,
  summary
) VALUES (
  ARRAY['VP of Product', 'Head of Product', 'Senior Director, Product Management', 'Director, Product Management'],
  ARRAY['Ann Arbor, MI', 'Detroit, MI', 'Grand Rapids, MI'],
  'remote_or_local',
  200000,
  'Total comp should include bonus and stock/equity. Would consider Director-level if total comp and growth potential are strong.',
  ARRAY['Senior product leadership role (portfolio or platform scope)', 'Competitive total compensation (base + bonus + equity)', 'Remote-friendly or located in Michigan'],
  ARRAY[]::text[],
  ARRAY['Life Sciences or Biotech industry', 'Higher Education or EdTech'],
  ARRAY['Life Sciences / Biotech', 'Higher Education / EdTech', 'B2B SaaS / Information Services'],
  ARRAY['P&L Leadership', 'Product Strategy', 'GenAI / AI Strategy', 'Post-Acquisition Integration', 'International Expansion', 'Pricing & Packaging', 'Enterprise Sales Enablement', 'Content Partnerships', 'Product-Led Growth', 'Cross-Platform Integration', 'Team Building', 'Market Expansion'],
  'GM-level product leader with full commercial accountability across multi-product B2B/B2C portfolios. PhD in Life Sciences, Executive MBA. 15+ year track record of protecting and growing recurring revenue. Managed $45M+ portfolio with 70%+ EBITDA. Experience across Life Sciences, Higher Education, B2B SaaS, and Information Services.'
);
