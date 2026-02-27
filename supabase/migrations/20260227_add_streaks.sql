-- Add streak tracking columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date date,
  ADD COLUMN IF NOT EXISTS daily_step_goal integer DEFAULT 10000;

-- Function to calculate/update streak after daily_steps upsert
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id uuid, p_date date)
RETURNS void AS $$
DECLARE
  v_steps integer;
  v_goal integer;
  v_current_streak integer;
  v_longest_streak integer;
  v_streak_freezes integer;
  v_last_streak_date date;
BEGIN
  -- Get today's steps
  SELECT steps INTO v_steps
  FROM daily_steps
  WHERE user_id = p_user_id AND date = p_date;

  IF v_steps IS NULL THEN
    RETURN;
  END IF;

  -- Get current streak state
  SELECT daily_step_goal, current_streak, longest_streak, streak_freezes, last_streak_date
  INTO v_goal, v_current_streak, v_longest_streak, v_streak_freezes, v_last_streak_date
  FROM user_settings
  WHERE user_id = p_user_id;

  IF v_goal IS NULL THEN
    v_goal := 10000;
  END IF;

  -- Did the user meet their goal?
  IF v_steps >= v_goal THEN
    IF v_last_streak_date IS NULL OR v_last_streak_date < p_date - interval '1 day' THEN
      -- Gap detected: check if a freeze is available
      IF v_last_streak_date = p_date - interval '2 days' AND v_streak_freezes > 0 THEN
        -- Apply freeze for the missed day
        v_streak_freezes := v_streak_freezes - 1;
        v_current_streak := v_current_streak + 1; -- count today
      ELSE
        -- Streak broken, start fresh
        v_current_streak := 1;
      END IF;
    ELSIF v_last_streak_date = p_date - interval '1 day' THEN
      -- Consecutive day
      v_current_streak := v_current_streak + 1;
    ELSIF v_last_streak_date = p_date THEN
      -- Already counted today, no change
      RETURN;
    ELSE
      v_current_streak := 1;
    END IF;

    -- Update longest
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;

    -- Award freeze: +1 per 7 consecutive days, max 3 stockpiled
    IF v_current_streak > 0 AND v_current_streak % 7 = 0 AND v_streak_freezes < 3 THEN
      v_streak_freezes := v_streak_freezes + 1;
    END IF;

    -- Save
    UPDATE user_settings
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        streak_freezes = v_streak_freezes,
        last_streak_date = p_date
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
