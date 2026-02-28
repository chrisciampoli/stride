-- Allow users who have been invited to a challenge to view it
-- This fixes private challenges being invisible to invited friends
CREATE POLICY "Invited users can view challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = auth.uid()
        AND n.type = 'challenge_invite'
        AND (n.data->>'challenge_id') = challenges.id::text
    )
  );
