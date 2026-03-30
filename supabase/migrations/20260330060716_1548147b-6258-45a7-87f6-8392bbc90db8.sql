CREATE POLICY "Users delete own google_tokens"
  ON google_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());