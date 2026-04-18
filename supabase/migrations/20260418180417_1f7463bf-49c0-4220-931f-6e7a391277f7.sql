-- Remove fictional seed/demo records ahead of launch.
-- All seed rows were inserted with NULL user_id; real user data has a user_id.
-- The job_boards rows with NULL user_id are intentionally kept — they are the
-- shared template catalog (LinkedIn, Indeed, Glassdoor, etc.), not seed data.

-- Delete dependent rows first to satisfy any FK constraints.
DELETE FROM public.contact_activities
WHERE contact_id IN (SELECT id FROM public.contacts WHERE user_id IS NULL);

DELETE FROM public.contact_campaigns
WHERE contact_id IN (SELECT id FROM public.contacts WHERE user_id IS NULL);

DELETE FROM public.contact_connections
WHERE contact_id_1 IN (SELECT id FROM public.contacts WHERE user_id IS NULL)
   OR contact_id_2 IN (SELECT id FROM public.contacts WHERE user_id IS NULL);

DELETE FROM public.job_contacts
WHERE contact_id IN (SELECT id FROM public.contacts WHERE user_id IS NULL)
   OR job_id    IN (SELECT id FROM public.jobs     WHERE user_id IS NULL);

DELETE FROM public.job_activities
WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

DELETE FROM public.interviews
WHERE user_id IS NULL
   OR job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

DELETE FROM public.cover_letters
WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

DELETE FROM public.job_skills_snapshots
WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

-- Now the seed parents.
DELETE FROM public.jobs               WHERE user_id IS NULL;
DELETE FROM public.contacts           WHERE user_id IS NULL;
DELETE FROM public.job_search_profile WHERE user_id IS NULL;