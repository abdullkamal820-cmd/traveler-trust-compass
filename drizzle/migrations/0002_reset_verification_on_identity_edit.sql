CREATE OR REPLACE FUNCTION public.protect_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    IF TG_TABLE_NAME = 'identities' THEN NEW.status := 'active'; END IF;
  ELSE
    NEW.verified := OLD.verified;
    IF TG_TABLE_NAME = 'identities' THEN
      NEW.status := OLD.status;
      NEW.qr_token := OLD.qr_token;
      -- Editing core passport data removes the verified badge until re-checked
      IF NEW.full_name IS DISTINCT FROM OLD.full_name
         OR NEW.passport_number IS DISTINCT FROM OLD.passport_number
         OR NEW.nationality IS DISTINCT FROM OLD.nationality
         OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
        NEW.verified := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Admins can mark a traveler identity verified from the admin panel
CREATE OR REPLACE FUNCTION public.admin_set_identity_verified(_identity_id uuid, _verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.identities SET verified = _verified, updated_at = now() WHERE id = _identity_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_identity_verified(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_identity_verified(uuid, boolean) TO authenticated;