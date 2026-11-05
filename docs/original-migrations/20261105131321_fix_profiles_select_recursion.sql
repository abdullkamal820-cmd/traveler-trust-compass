/*
# Fix infinite recursion in profiles read policy

1. Problem
- The profiles SELECT policy checked for admins by querying profiles itself.
- Postgres rejects that self-reference, so reading any profile could fail and break sign-in.

2. Changes
- New function public.is_admin(): returns true when the signed-in user has role 'admin'.
  It runs with owner rights so it reads profiles without re-applying RLS.
- profiles SELECT policy now uses is_admin() instead of a self-referencing subquery.

3. Security
- The function is only executable by signed-in users (revoked from PUBLIC and anon).
- Users can still read only their own profile; admins can read all profiles.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());
