ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check CHECK (status = ANY (ARRAY['active'::text, 'upcoming'::text, 'completed'::text, 'tiebreaker'::text, 'cancelled'::text]));
