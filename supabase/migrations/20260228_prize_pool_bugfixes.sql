-- Prize Pool Bugfixes Migration
-- 1. Add 'cancelled' to challenge status constraint
-- 2. Create increment_prize_pool RPC (atomic, race-condition-safe)
-- 3. Enable realtime for challenges table (live prize pool updates)

-- =============================================================================
-- 1. ADD 'cancelled' TO CHALLENGE STATUS CONSTRAINT
-- =============================================================================
DO $$
BEGIN
  ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
  ALTER TABLE challenges ADD CONSTRAINT challenges_status_check
    CHECK (status IN ('active', 'upcoming', 'completed', 'tiebreaker', 'cancelled'));
EXCEPTION
  WHEN others THEN NULL;
END;
$$;

-- =============================================================================
-- 2. ATOMIC PRIZE POOL INCREMENT (prevents race condition in webhook)
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_prize_pool(p_challenge_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE challenges
  SET prize_pool_cents = prize_pool_cents + p_amount,
      prize_status = CASE WHEN prize_status = 'none' THEN 'collecting' ELSE prize_status END,
      updated_at = now()
  WHERE id = p_challenge_id;
END;
$$;

-- =============================================================================
-- 3. ENABLE REALTIME FOR CHALLENGES TABLE (live prize pool updates)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
