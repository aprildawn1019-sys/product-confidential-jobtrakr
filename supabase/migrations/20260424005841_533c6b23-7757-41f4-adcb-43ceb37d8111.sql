-- Collapse outreach stages: contacted + in_conversation → engaged; referral_made → closed (with outcome).
-- Reason taxonomy stored in existing `outcome` column.

-- Step 1: Promote referral_made rows to closed, capturing the win in outcome.
UPDATE public.outreaches
SET stage = 'closed',
    outcome = 'referral_made',
    closed_at = COALESCE(closed_at, referral_made_at, to_char(now(), 'YYYY-MM-DD')),
    updated_at = now()
WHERE stage = 'referral_made';

-- Step 2: Merge contacted + in_conversation into single 'engaged' stage.
UPDATE public.outreaches
SET stage = 'engaged',
    updated_at = now()
WHERE stage IN ('contacted', 'in_conversation');

-- Step 3: For closed rows that lack an outcome, default to 'other' so the UI can render a chip.
UPDATE public.outreaches
SET outcome = 'other'
WHERE stage = 'closed' AND (outcome IS NULL OR outcome = '');