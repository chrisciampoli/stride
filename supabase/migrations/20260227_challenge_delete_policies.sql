-- Allow challenge creators to delete their own challenges
CREATE POLICY "Creators can delete their own challenges"
  ON challenges FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow challenge creators to delete participants of their challenge
CREATE POLICY "Creators can delete challenge participants"
  ON challenge_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_participants.challenge_id
        AND challenges.created_by = auth.uid()
    )
  );

-- Allow participants to remove themselves from a challenge
CREATE POLICY "Participants can delete own participation"
  ON challenge_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
