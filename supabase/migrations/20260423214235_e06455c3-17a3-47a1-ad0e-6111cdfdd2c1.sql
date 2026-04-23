-- Create weekly_plans table for cached AI-generated weekly plans
CREATE TABLE public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scoreboard JSONB NOT NULL DEFAULT '{}'::jsonb,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

-- Policies: users manage own weekly plans
CREATE POLICY "Users view own weekly_plans"
ON public.weekly_plans FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own weekly_plans"
ON public.weekly_plans FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own weekly_plans"
ON public.weekly_plans FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own weekly_plans"
ON public.weekly_plans FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookup of latest plan per user
CREATE INDEX idx_weekly_plans_user_week ON public.weekly_plans (user_id, week_start DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER touch_weekly_plans_updated_at
BEFORE UPDATE ON public.weekly_plans
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();