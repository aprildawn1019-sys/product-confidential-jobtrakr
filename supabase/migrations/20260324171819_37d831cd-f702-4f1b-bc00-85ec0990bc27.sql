ALTER TABLE public.job_boards
  ADD COLUMN is_gated boolean NOT NULL DEFAULT false,
  ADD COLUMN public_url text,
  ADD COLUMN gate_checked_at timestamp with time zone;