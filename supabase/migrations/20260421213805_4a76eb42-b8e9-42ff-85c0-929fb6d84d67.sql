ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.contacts.avatar_url IS
  'Optional profile photo URL. Auto-populated when a contact is created from a LinkedIn scrape (og:image / JSON-LD image), or set manually. Falls back to initials in the UI when null or when the image fails to load.';