-- Tighten linkedin-avatars storage: only the edge function (service_role) can write,
-- everyone can read cached files.

-- Ensure bucket exists and stays public for reads
UPDATE storage.buckets
SET public = true
WHERE id = 'linkedin-avatars';

-- Drop any prior client-write policies (defensive; none expected)
DROP POLICY IF EXISTS "LinkedIn avatars: clients cannot insert" ON storage.objects;
DROP POLICY IF EXISTS "LinkedIn avatars: clients cannot update" ON storage.objects;
DROP POLICY IF EXISTS "LinkedIn avatars: clients cannot delete" ON storage.objects;

-- Explicit no-op write policies for anon + authenticated roles.
-- Service role bypasses RLS, so the edge function (using SERVICE_ROLE_KEY) can still write.
CREATE POLICY "LinkedIn avatars: clients cannot insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id <> 'linkedin-avatars');

CREATE POLICY "LinkedIn avatars: clients cannot update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id <> 'linkedin-avatars')
WITH CHECK (bucket_id <> 'linkedin-avatars');

CREATE POLICY "LinkedIn avatars: clients cannot delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id <> 'linkedin-avatars');