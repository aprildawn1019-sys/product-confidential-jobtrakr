ALTER TABLE public.job_search_profile
  ADD COLUMN IF NOT EXISTS company_sizes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_style text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS travel_willingness text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS start_availability text NOT NULL DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS culture_preferences text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technical_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS soft_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools_platforms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS spoken_languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience integer;