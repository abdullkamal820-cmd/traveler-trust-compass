-- ST&ID schema (ported from original project migrations 1, 2, 4)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'traveler' CHECK (role IN ('traveler', 'business', 'admin')),
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'other' CHECK (business_type IN ('hotel','airline','car_rental','tour_operator','cruise','other')),
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_businesses" ON public.businesses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "insert_own_business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_own_business" ON public.businesses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  nationality text NOT NULL DEFAULT '',
  passport_number text NOT NULL DEFAULT '',
  passport_type text,
  date_of_birth date,
  gender text,
  place_of_birth text,
  issue_date date,
  expiry_date date,
  issuing_country text,
  document_type text NOT NULL DEFAULT 'passport',
  qr_token text UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identities TO authenticated;
GRANT ALL ON public.identities TO service_role;
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_own_identities" ON public.identities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_own_identities" ON public.identities FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_own_identities" ON public.identities FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  traveler_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  booking_reference text UNIQUE NOT NULL DEFAULT upper(encode(extensions.gen_random_bytes(6), 'hex')),
  service_type text NOT NULL DEFAULT 'other' CHECK (service_type IN ('flight','hotel','car_rental','tour','cruise','other')),
  origin text,
  destination text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes text,
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('instapay','vodafone_cash')),
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_bookings" ON public.bookings FOR SELECT TO authenticated USING (
  traveler_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.user_id = auth.uid())
  OR public.is_admin());
CREATE POLICY "insert_bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.user_id = auth.uid()));
CREATE POLICY "update_bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.user_id = auth.uid()));
CREATE POLICY "delete_bookings" ON public.bookings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  traveler_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  qr_token_scanned text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT 'verified' CHECK (result IN ('verified','mismatch','not_found')),
  verified_fields jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_verifications" ON public.verifications FOR SELECT TO authenticated USING (
  traveler_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = verifications.business_id AND b.user_id = auth.uid())
  OR public.is_admin());
CREATE POLICY "insert_verifications" ON public.verifications FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = verifications.business_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.mismatch_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid REFERENCES public.verifications(id) ON DELETE SET NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  traveler_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  report_reason text NOT NULL DEFAULT '',
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.mismatch_reports TO authenticated;
GRANT ALL ON public.mismatch_reports TO service_role;
ALTER TABLE public.mismatch_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_mismatch_reports" ON public.mismatch_reports FOR SELECT TO authenticated USING (
  traveler_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = mismatch_reports.business_id AND b.user_id = auth.uid())
  OR public.is_admin());
CREATE POLICY "insert_mismatch_reports" ON public.mismatch_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = mismatch_reports.business_id AND b.user_id = auth.uid()));
CREATE POLICY "update_mismatch_reports" ON public.mismatch_reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_user_id ON public.identities(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_traveler_user_id ON public.bookings(traveler_user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_business_id ON public.verifications(business_id);
CREATE INDEX IF NOT EXISTS idx_verifications_traveler_user_id ON public.verifications(traveler_user_id);
CREATE INDEX IF NOT EXISTS idx_mismatch_reports_business_id ON public.mismatch_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_mismatch_reports_traveler_user_id ON public.mismatch_reports(traveler_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);