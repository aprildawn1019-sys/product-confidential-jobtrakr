
-- Add CRM columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN relationship_warmth text DEFAULT NULL,
  ADD COLUMN follow_up_date text DEFAULT NULL,
  ADD COLUMN conversation_log text DEFAULT NULL;

-- Create contact_activities table
CREATE TABLE public.contact_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'other',
  activity_date text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contact_activities"
  ON public.contact_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger to auto-update last_contacted_at on contacts
CREATE OR REPLACE FUNCTION public.update_contact_last_contacted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contacts
  SET last_contacted_at = NEW.activity_date
  WHERE id = NEW.contact_id
    AND (last_contacted_at IS NULL OR last_contacted_at < NEW.activity_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_last_contacted
  AFTER INSERT ON public.contact_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_last_contacted();
