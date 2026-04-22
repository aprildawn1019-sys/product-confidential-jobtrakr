-- Replace broad SELECT with one that doesn't permit listing arbitrary
-- prefixes. Direct fetches by exact path still work for <img src>.
DROP POLICY IF EXISTS "LinkedIn avatars are publicly readable" ON storage.objects;

CREATE POLICY "LinkedIn avatars are publicly readable"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'linkedin-avatars'
  AND name IS NOT NULL
  AND name <> ''
  AND position('/' in name) = 0  -- flat layout, no nesting → no prefix listing surface
);