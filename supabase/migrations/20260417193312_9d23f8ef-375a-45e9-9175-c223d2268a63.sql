-- Fix update_contact_last_contacted to enforce ownership of the contact being mutated
CREATE OR REPLACE FUNCTION public.update_contact_last_contacted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.contacts
  SET last_contacted_at = NEW.activity_date
  WHERE id = NEW.contact_id
    AND user_id = NEW.user_id  -- enforce ownership: only update contacts owned by the same user inserting the activity
    AND (last_contacted_at IS NULL OR last_contacted_at < NEW.activity_date);
  RETURN NEW;
END;
$function$;