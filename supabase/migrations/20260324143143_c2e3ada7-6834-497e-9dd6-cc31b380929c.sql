ALTER TABLE public.job_boards DROP CONSTRAINT IF EXISTS job_boards_name_key;
ALTER TABLE public.job_boards ADD CONSTRAINT job_boards_user_id_name_key UNIQUE (user_id, name);