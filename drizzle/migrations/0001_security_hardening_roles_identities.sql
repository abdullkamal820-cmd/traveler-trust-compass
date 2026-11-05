-- 1. Roles live in a protected table
CREATE TYPE public.app_role AS ENUM ('traveler', 'business', 'admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE POLICY "read_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- 2. profiles.role becomes a read-only mirror of user_roles (NULL = role not chosen yet)
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, phone) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles SET role = (
    SELECT role::text FROM public.user_roles WHERE user_id = uid
    ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'business' THEN 1 ELSE 2 END LIMIT 1
  ) WHERE id = uid;
  RETURN NULL;
END $$;
CREATE TRIGGER user_roles_sync AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- 3. Profile auto-created on signup; only traveler/business may be self-selected
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wanted text := NEW.raw_user_meta_data->>'role';
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  IF wanted IN ('traveler','business') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, wanted::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- One-time role choice for users who signed in with Google / phone
CREATE OR REPLACE FUNCTION public.choose_initial_role(_role text, _full_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role NOT IN ('traveler','business') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Role already chosen';
  END IF;
  INSERT INTO public.profiles (id, full_name) VALUES (auth.uid(), COALESCE(_full_name,''))
    ON CONFLICT (id) DO UPDATE SET full_name = COALESCE(NULLIF(_full_name,''), public.profiles.full_name);
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role::public.app_role);
END $$;
REVOKE EXECUTE ON FUNCTION public.choose_initial_role(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_initial_role(text, text) TO authenticated;

-- 4. Passport data: only the owner and admins can read identities
CREATE POLICY "select_own_identities" ON public.identities FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Travelers cannot self-verify or change status; businesses cannot self-verify
CREATE OR REPLACE FUNCTION public.protect_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    IF TG_TABLE_NAME = 'identities' THEN NEW.status := 'active'; END IF;
  ELSE
    NEW.verified := OLD.verified;
    IF TG_TABLE_NAME = 'identities' THEN NEW.status := OLD.status; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER identities_protect BEFORE INSERT OR UPDATE ON public.identities
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();
CREATE TRIGGER businesses_protect BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_fields();

-- Admins can verify businesses and identities
CREATE POLICY "admin_update_businesses" ON public.businesses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_identities" ON public.identities FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only real business accounts can create a business profile
DROP POLICY IF EXISTS "insert_own_business" ON public.businesses;
CREATE POLICY "insert_own_business" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'business'));

-- 5. Business QR verification: look up ONE traveler by the token they present, and log it
CREATE OR REPLACE FUNCTION public.verify_traveler_qr(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz public.businesses; idn public.identities; prof public.profiles; vid uuid;
  clean text := trim(both from coalesce(_token,''));
BEGIN
  IF NOT public.has_role(auth.uid(), 'business') THEN RAISE EXCEPTION 'Only business accounts can verify travelers'; END IF;
  SELECT * INTO biz FROM public.businesses WHERE user_id = auth.uid() LIMIT 1;
  IF biz.id IS NULL THEN RAISE EXCEPTION 'Set up your business profile first'; END IF;
  -- accept raw token or a URL/JSON containing it
  clean := COALESCE(substring(clean from '([a-f0-9]{32})'), clean);
  SELECT * INTO idn FROM public.identities WHERE qr_token = clean LIMIT 1;
  IF idn.id IS NULL OR idn.status <> 'active' THEN
    INSERT INTO public.verifications (business_id, qr_token_scanned, result)
      VALUES (biz.id, left(clean, 200), 'not_found');
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = idn.user_id;
  INSERT INTO public.verifications (business_id, traveler_user_id, identity_id, qr_token_scanned, result, verified_fields)
    VALUES (biz.id, idn.user_id, idn.id, clean, 'verified',
      '{"full_name":true,"nationality":true,"passport_number":true,"date_of_birth":true}'::jsonb)
    RETURNING id INTO vid;
  RETURN jsonb_build_object('status','found','verification_id', vid,
    'identity', jsonb_build_object('id', idn.id, 'user_id', idn.user_id, 'full_name', idn.full_name,
      'nationality', idn.nationality, 'passport_number', idn.passport_number, 'passport_type', idn.passport_type,
      'date_of_birth', idn.date_of_birth, 'gender', idn.gender, 'place_of_birth', idn.place_of_birth,
      'issue_date', idn.issue_date, 'expiry_date', idn.expiry_date, 'issuing_country', idn.issuing_country,
      'document_type', idn.document_type, 'status', idn.status, 'verified', idn.verified,
      'qr_token', '', 'created_at', idn.created_at, 'updated_at', idn.updated_at),
    'traveler', jsonb_build_object('id', prof.id, 'full_name', prof.full_name, 'role', prof.role,
      'avatar_url', prof.avatar_url, 'phone', null, 'created_at', prof.created_at));
END $$;
REVOKE EXECUTE ON FUNCTION public.verify_traveler_qr(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_traveler_qr(text) TO authenticated;

-- Businesses can see names of travelers they have bookings/verifications with
CREATE POLICY "business_read_related_travelers" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.verifications v JOIN public.businesses b ON b.id = v.business_id
          WHERE v.traveler_user_id = profiles.id AND b.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.bookings bk JOIN public.businesses b ON b.id = bk.business_id
          WHERE bk.traveler_user_id = profiles.id AND b.user_id = auth.uid()));

-- Mismatch reports must reference a traveler this business actually verified
DROP POLICY IF EXISTS "insert_mismatch_reports" ON public.mismatch_reports;
CREATE POLICY "insert_mismatch_reports" ON public.mismatch_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = mismatch_reports.business_id AND b.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.verifications v WHERE v.business_id = mismatch_reports.business_id AND v.traveler_user_id = mismatch_reports.traveler_user_id));

-- Direct verification inserts are replaced by verify_traveler_qr (prevents forged logs)
DROP POLICY IF EXISTS "insert_verifications" ON public.verifications;