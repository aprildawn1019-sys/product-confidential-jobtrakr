CREATE TABLE public.action_snoozes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_signature text NOT NULL,
  snoozed_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_action_snoozes_user_signature
  ON public.action_snoozes(user_id, action_signature);

CREATE INDEX idx_action_snoozes_user_until
  ON public.action_snoozes(user_id, snoozed_until);

ALTER TABLE public.action_snoozes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own action_snoozes"
  ON public.action_snoozes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own action_snoozes"
  ON public.action_snoozes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own action_snoozes"
  ON public.action_snoozes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own action_snoozes"
  ON public.action_snoozes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());