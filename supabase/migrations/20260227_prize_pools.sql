-- Prize Pools Migration
-- Adds wallet system, Stripe Connect, prize distributions, and extends challenges for paid entries

-- =============================================================================
-- 1. EXTEND EXISTING TABLES
-- =============================================================================

-- Add prize pool columns to challenges
ALTER TABLE challenges
  ADD COLUMN entry_fee_cents integer DEFAULT 0,
  ADD COLUMN is_paid boolean DEFAULT false,
  ADD COLUMN prize_pool_cents integer DEFAULT 0,
  ADD COLUMN payout_structure jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN min_participants integer DEFAULT 0,
  ADD COLUMN prize_status text DEFAULT 'none',
  ADD COLUMN tiebreaker_end_date timestamptz;

-- Add payment columns to challenge_participants
ALTER TABLE challenge_participants
  ADD COLUMN payment_intent_id text,
  ADD COLUMN payment_status text DEFAULT 'none',
  ADD COLUMN paid_amount_cents integer DEFAULT 0,
  ADD COLUMN refund_id text;

-- Add constraints
ALTER TABLE challenges
  ADD CONSTRAINT challenges_entry_fee_cents_check CHECK (entry_fee_cents >= 0 AND entry_fee_cents <= 10000),
  ADD CONSTRAINT challenges_prize_pool_cents_check CHECK (prize_pool_cents >= 0),
  ADD CONSTRAINT challenges_prize_status_check CHECK (prize_status IN ('none', 'collecting', 'funded', 'distributing', 'distributed', 'refunding', 'refunded')),
  ADD CONSTRAINT challenges_min_participants_check CHECK (min_participants >= 0);

ALTER TABLE challenge_participants
  ADD CONSTRAINT cp_payment_status_check CHECK (payment_status IN ('none', 'pending', 'paid', 'refunded'));

-- =============================================================================
-- 2. NEW TABLES
-- =============================================================================

-- Wallets
CREATE TABLE wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Wallet Transactions (append-only ledger)
CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('prize_won', 'entry_fee', 'cashout', 'refund', 'cashout_reversal')),
  amount_cents integer NOT NULL,
  description text,
  reference_id text,
  idempotency_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Stripe Connect Accounts
CREATE TABLE stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  payouts_enabled boolean DEFAULT false,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Prize Distributions (audit trail)
CREATE TABLE prize_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place integer NOT NULL,
  amount_cents integer NOT NULL,
  transfer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, place)
);

ALTER TABLE prize_distributions ENABLE ROW LEVEL SECURITY;

-- Stripe Webhook Events (deduplication)
CREATE TABLE stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. RLS POLICIES
-- =============================================================================

-- Wallets: users read own only, writes via SECURITY DEFINER functions
CREATE POLICY "Users can read own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Wallet Transactions: users read own only
CREATE POLICY "Users can read own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Stripe Connect Accounts: users read own only
CREATE POLICY "Users can read own connect account"
  ON stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Prize Distributions: participants can read distributions for their challenges
CREATE POLICY "Participants can read prize distributions"
  ON prize_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp
      WHERE cp.challenge_id = prize_distributions.challenge_id
        AND cp.user_id = auth.uid()
    )
  );

-- Stripe Webhook Events: no client access (server only)
-- No SELECT/INSERT/UPDATE/DELETE policies = no client access

-- =============================================================================
-- 4. SECURITY DEFINER FUNCTIONS (wallet operations)
-- =============================================================================

-- Credit wallet (add funds)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_reference_id text,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_tx_id uuid;
  v_existing_tx uuid;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM wallet_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_tx IS NOT NULL THEN
      RETURN v_existing_tx;
    END IF;
  END IF;

  -- Ensure wallet exists (create if not)
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and update wallet balance
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  UPDATE wallets
  SET balance_cents = balance_cents + p_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Insert transaction record
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, description, reference_id, idempotency_key)
  VALUES (v_wallet_id, p_user_id, p_type, p_amount, p_description, p_reference_id, p_idempotency_key)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Debit wallet (remove funds with balance check)
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_reference_id text,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_balance integer;
  v_tx_id uuid;
  v_existing_tx uuid;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM wallet_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_tx IS NOT NULL THEN
      RETURN v_existing_tx;
    END IF;
  END IF;

  -- Lock wallet and check balance
  SELECT id, balance_cents INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, p_amount;
  END IF;

  -- Debit the wallet
  UPDATE wallets
  SET balance_cents = balance_cents - p_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Insert transaction record (negative amount for debit)
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, description, reference_id, idempotency_key)
  VALUES (v_wallet_id, p_user_id, p_type, -p_amount, p_description, p_reference_id, p_idempotency_key)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Validate payout structure trigger
CREATE OR REPLACE FUNCTION validate_payout_structure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
BEGIN
  -- Only validate for paid challenges with a payout structure
  IF NEW.is_paid = true AND jsonb_array_length(NEW.payout_structure) > 0 THEN
    SELECT COALESCE(SUM((elem->>'pct')::integer), 0)
    INTO v_total
    FROM jsonb_array_elements(NEW.payout_structure) AS elem;

    IF v_total != 100 THEN
      RAISE EXCEPTION 'Payout structure percentages must sum to 100, got %', v_total;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payout_structure
  BEFORE INSERT OR UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION validate_payout_structure();

-- =============================================================================
-- 5. INDEXES
-- =============================================================================

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_prize_distributions_challenge_id ON prize_distributions(challenge_id);
CREATE INDEX idx_prize_distributions_user_id ON prize_distributions(user_id);
CREATE INDEX idx_challenges_prize_status ON challenges(prize_status) WHERE is_paid = true;
CREATE INDEX idx_challenges_is_paid ON challenges(is_paid) WHERE is_paid = true;
CREATE INDEX idx_cp_payment_status ON challenge_participants(payment_status) WHERE payment_status != 'none';

-- =============================================================================
-- 6. ADD 'tiebreaker' TO CHALLENGE STATUS
-- =============================================================================
-- The status column is text, so no enum alteration needed.
-- We add a check constraint to ensure valid statuses.
-- First check if there's an existing constraint:
DO $$
BEGIN
  -- Drop existing status constraint if any
  ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
  -- Add new constraint including tiebreaker
  ALTER TABLE challenges ADD CONSTRAINT challenges_status_check
    CHECK (status IN ('active', 'upcoming', 'completed', 'tiebreaker'));
EXCEPTION
  WHEN others THEN NULL;
END;
$$;

-- =============================================================================
-- 7. ENABLE REALTIME for challenge_participants (for live leaderboards)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants;
