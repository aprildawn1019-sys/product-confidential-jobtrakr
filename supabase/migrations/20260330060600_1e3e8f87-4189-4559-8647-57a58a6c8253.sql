-- Fix api_rate_limits: drop ALL policy, create SELECT+INSERT only
DROP POLICY IF EXISTS "Users manage own rate limits" ON api_rate_limits;

CREATE POLICY "Users view own rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own rate limits"
  ON api_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix google_tokens: drop ALL policy, create SELECT+INSERT+UPDATE only
DROP POLICY IF EXISTS "Users manage own google_tokens" ON google_tokens;

CREATE POLICY "Users view own google_tokens"
  ON google_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own google_tokens"
  ON google_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own google_tokens"
  ON google_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());