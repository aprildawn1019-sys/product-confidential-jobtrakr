
CREATE TABLE public.target_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  careers_url text,
  industry text,
  size text,
  priority text NOT NULL DEFAULT 'interested' CHECK (priority IN ('dream', 'strong', 'interested')),
  status text NOT NULL DEFAULT 'researching' CHECK (status IN ('researching', 'applied', 'connected', 'archived')),
  notes text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.target_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own target_companies"
  ON public.target_companies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
