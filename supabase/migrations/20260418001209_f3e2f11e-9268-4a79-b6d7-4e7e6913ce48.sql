-- Replace the broad ALL policy with explicit per-command policies that
-- additionally verify the contact being logged against belongs to the same user.
DROP POLICY IF EXISTS "Users manage own contact_activities" ON public.contact_activities;

CREATE POLICY "Users view own contact_activities"
ON public.contact_activities
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own contact_activities"
ON public.contact_activities
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_activities.contact_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users update own contact_activities"
ON public.contact_activities
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_activities.contact_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users delete own contact_activities"
ON public.contact_activities
FOR DELETE
TO authenticated
USING (user_id = auth.uid());