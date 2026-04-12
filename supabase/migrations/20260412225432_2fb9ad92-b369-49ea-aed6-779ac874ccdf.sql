
-- Add network_role to contacts
ALTER TABLE public.contacts ADD COLUMN network_role TEXT;

-- Add relationship_label to contact_connections
ALTER TABLE public.contact_connections ADD COLUMN relationship_label TEXT;
