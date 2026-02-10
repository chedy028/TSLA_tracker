-- Migration: Add profile self-heal support for authenticated users
-- This prevents users from being stuck in "free" state when profile rows are missing.

-- Allow authenticated users to create their own profile row if missing.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Helper used by the client to recreate profile + default alert settings safely.
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    u.raw_user_meta_data->>'avatar_url'
  INTO v_email, v_full_name, v_avatar_url
  FROM auth.users u
  WHERE u.id = v_user_id;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (v_user_id, v_email, v_full_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

  INSERT INTO public.alert_settings (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

