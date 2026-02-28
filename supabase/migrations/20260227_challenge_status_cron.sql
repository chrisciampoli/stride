-- Challenge Status Transition Cron Job
-- Transitions: upcoming → active at start_date, active → completed at end_date

-- Enable pg_cron if not already enabled (requires Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to transition challenge statuses
CREATE OR REPLACE FUNCTION transition_challenge_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upcoming → Active (start_date has passed)
  UPDATE challenges
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming'
    AND start_date <= now();

  -- Active → Completed (end_date has passed, not in tiebreaker)
  UPDATE challenges
  SET status = 'completed', updated_at = now()
  WHERE status = 'active'
    AND end_date <= now();

  -- Tiebreaker → Completed (tiebreaker_end_date has passed)
  UPDATE challenges
  SET status = 'completed', updated_at = now()
  WHERE status = 'tiebreaker'
    AND tiebreaker_end_date IS NOT NULL
    AND tiebreaker_end_date <= now();
END;
$$;

-- Schedule: run every 15 minutes
-- Note: pg_cron must be enabled in Supabase dashboard first.
-- Uncomment below after enabling:
-- SELECT cron.schedule('transition-challenge-statuses', '*/15 * * * *', 'SELECT transition_challenge_statuses()');

-- Also schedule prize distribution and refund checks (hourly)
-- SELECT cron.schedule('distribute-prizes', '0 * * * *', $$SELECT net.http_post(url := current_setting('app.settings.supabase_url') || '/functions/v1/distribute-prizes', headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')))$$);
-- SELECT cron.schedule('refund-challenges', '0 * * * *', $$SELECT net.http_post(url := current_setting('app.settings.supabase_url') || '/functions/v1/refund-challenge', headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')))$$);
