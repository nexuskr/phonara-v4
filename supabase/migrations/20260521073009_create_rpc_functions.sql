/*
  # Create RPC Functions for Atomic Wallet Operations and Viral Tree

  1. New Functions
    - `decrement_balance(user_id uuid, amount numeric, is_demo boolean)`:
      Atomically decrements demo_balance or fuel_balance. Returns the new balance or raises exception if insufficient.
    - `increment_balance(user_id uuid, amount numeric, is_demo boolean)`:
      Atomically increments demo_balance or fuel_balance. Returns the new balance.
    - `get_viral_tree(root_user_id uuid)`:
      Recursive CTE that returns the full viral referral tree starting from a given user.
      Returns: id, referrer_id, referred_id, referral_code, chain_level, total_earned, username

  2. Security
    - Functions are SECURITY DEFINER so they run with elevated privileges
    - decrement_balance checks balance >= amount before deducting
    - Only authenticated users can call these functions

  3. Important Notes
    - decrement_balance uses UPDATE ... RETURNING for atomic read-modify-write
    - get_viral_tree uses recursive CTE with max depth of 20 to prevent infinite loops
*/

CREATE OR REPLACE FUNCTION public.decrement_balance(
  p_user_id uuid,
  p_amount numeric,
  p_is_demo boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF p_is_demo THEN
    UPDATE public.fuel_wallets
    SET demo_balance = demo_balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND demo_balance >= p_amount
    RETURNING demo_balance INTO v_new_balance;
  ELSE
    UPDATE public.fuel_wallets
    SET fuel_balance = fuel_balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND fuel_balance >= p_amount
    RETURNING fuel_balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_balance(
  p_user_id uuid,
  p_amount numeric,
  p_is_demo boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF p_is_demo THEN
    UPDATE public.fuel_wallets
    SET demo_balance = demo_balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING demo_balance INTO v_new_balance;
  ELSE
    UPDATE public.fuel_wallets
    SET fuel_balance = fuel_balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING fuel_balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_viral_tree(p_root_user_id uuid)
RETURNS TABLE(
  id uuid,
  referrer_id uuid,
  referred_id uuid,
  referral_code text,
  chain_level integer,
  total_earned numeric,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE viral_tree AS (
    SELECT vr.id, vr.referrer_id, vr.referred_id, vr.referral_code,
           vr.chain_level, vr.total_earned, p.username,
           0 AS depth
    FROM public.viral_referrals vr
    JOIN public.profiles p ON p.id = vr.referred_id
    WHERE vr.referrer_id = p_root_user_id

    UNION ALL

    SELECT vr.id, vr.referrer_id, vr.referred_id, vr.referral_code,
           vr.chain_level, vr.total_earned, p.username,
           vt.depth + 1
    FROM public.viral_referrals vr
    JOIN public.profiles p ON p.id = vr.referred_id
    JOIN viral_tree vt ON vr.referrer_id = vt.referred_id
    WHERE vt.depth < 20
  )
  SELECT vt.id, vt.referrer_id, vt.referred_id, vt.referral_code,
         vt.chain_level, vt.total_earned, vt.username
  FROM viral_tree vt
  ORDER BY vt.depth, vt.chain_level;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_balance(uuid, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(uuid, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_viral_tree(uuid) TO authenticated;
