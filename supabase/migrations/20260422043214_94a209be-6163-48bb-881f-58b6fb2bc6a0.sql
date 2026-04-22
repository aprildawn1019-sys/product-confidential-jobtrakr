-- Create a public storage bucket for cached LinkedIn profile avatars.
-- Files are stored under `<contact_id_or_url_hash>.<ext>` and served
-- publicly so <img src=...> works without auth headers.
INSERT INTO storage.buckets (id, name, public)
VALUES ('linkedin-avatars', 'linkedin-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for cached avatars (they're already public LinkedIn og:images)
DROP POLICY IF EXISTS "LinkedIn avatars are publicly readable" ON storage.objects;
CREATE POLICY "LinkedIn avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'linkedin-avatars');

-- Only the edge function (service role) writes to this bucket; no
-- authenticated-user insert/update/delete policies are needed.