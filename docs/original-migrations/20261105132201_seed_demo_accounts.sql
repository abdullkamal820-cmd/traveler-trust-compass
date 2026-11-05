/*
# Seed demo accounts with distinct personalities

## Overview
Creates five ready-to-use demo accounts so the platform can be shown to visitors
without registering. Each account has a different personality and realistic linked data.

## Accounts (password for all: StidDemo2026!)
1. Leo Marchetti (traveler) - The Adventurous Backpacker. Verified identity, upcoming flight and hotel.
2. Hana Sato (traveler) - The Meticulous Business Traveler. Verified identity, completed hotel stay.
3. Skyline Airways (business, airline) - The Efficient Airline. Verifies travelers and issues flight bookings.
4. Casa Serena Hotel (business, hotel) - The Warm Hospitality Host. Verifies guests and raises a mismatch report.
5. Dana Okafor (admin) - The Calm Trust and Safety Lead. Reviews reports across the platform.

## New Data
- auth.users and auth.identities rows for the 5 accounts (email confirmed, password login enabled).
- profiles rows with role and display name.
- businesses rows for the two business accounts.
- identities rows (digital travel cards) for the two travelers.
- bookings, verifications and one mismatch report linking them together.

## Security
- Only demo data is inserted. No existing rows are modified.
- The whole seed is skipped if the first demo account already exists, so re-running is safe.
- Demo passwords are intentionally simple for presentations; remove these accounts before production launch.
*/

DO $$
DECLARE
  pw_hash text;
  leo_id uuid := '11111111-1111-4111-8111-111111111111';
  hana_id uuid := '22222222-2222-4222-8222-222222222222';
  skyline_id uuid := '33333333-3333-4333-8333-333333333333';
  serena_id uuid := '44444444-4444-4444-8444-444444444444';
  dana_id uuid := '55555555-5555-4555-8555-555555555555';
  skyline_biz uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  serena_biz uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  leo_identity uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
  hana_identity uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  leo_verification uuid := 'cccccccc-0000-4000-8000-000000000001';
  hana_verification uuid := 'cccccccc-0000-4000-8000-000000000002';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = leo_id) THEN
    RETURN;
  END IF;

  pw_hash := extensions.crypt('StidDemo2026!', extensions.gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', leo_id, 'authenticated', 'authenticated', 'leo.marchetti@demo.stid.test', pw_hash, now(),
      '{"provider":"email","providers":["email"]}', '{"role":"traveler","full_name":"Leo Marchetti"}', now(), now(), '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', hana_id, 'authenticated', 'authenticated', 'hana.sato@demo.stid.test', pw_hash, now(),
      '{"provider":"email","providers":["email"]}', '{"role":"traveler","full_name":"Hana Sato"}', now(), now(), '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', skyline_id, 'authenticated', 'authenticated', 'skyline@demo.stid.test', pw_hash, now(),
      '{"provider":"email","providers":["email"]}', '{"role":"business","full_name":"Skyline Airways"}', now(), now(), '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', serena_id, 'authenticated', 'authenticated', 'serena@demo.stid.test', pw_hash, now(),
      '{"provider":"email","providers":["email"]}', '{"role":"business","full_name":"Casa Serena Hotel"}', now(), now(), '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', dana_id, 'authenticated', 'authenticated', 'dana.okafor@demo.stid.test', pw_hash, now(),
      '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Dana Okafor"}', now(), now(), '', '', '', '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT u.id, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
    'email', u.id::text, now(), now(), now()
  FROM auth.users u
  WHERE u.id IN (leo_id, hana_id, skyline_id, serena_id, dana_id);

  INSERT INTO profiles (id, role, full_name) VALUES
    (leo_id, 'traveler', 'Leo Marchetti'),
    (hana_id, 'traveler', 'Hana Sato'),
    (skyline_id, 'business', 'Skyline Airways'),
    (serena_id, 'business', 'Casa Serena Hotel'),
    (dana_id, 'admin', 'Dana Okafor')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO businesses (id, user_id, business_name, business_type, country, city, address, verified) VALUES
    (skyline_biz, skyline_id, 'Skyline Airways', 'airline', 'Portugal', 'Lisbon', 'Terminal 2, Humberto Delgado Airport', true),
    (serena_biz, serena_id, 'Casa Serena Hotel', 'hotel', 'Italy', 'Florence', 'Via dei Serragli 14', true);

  INSERT INTO identities (id, user_id, full_name, nationality, passport_number, passport_type, date_of_birth, gender,
    place_of_birth, issue_date, expiry_date, issuing_country, document_type, verified, status) VALUES
    (leo_identity, leo_id, 'Leo Marchetti', 'ITA', 'YA4821937', 'P', '1997-04-12', 'M',
      'Milan', '2021-03-10', '2031-03-09', 'ITA', 'passport', true, 'active'),
    (hana_identity, hana_id, 'Hana Sato', 'JPN', 'TK4471829', 'P', '1984-09-03', 'F',
      'Tokyo', '2022-06-18', '2032-06-17', 'JPN', 'passport', true, 'active');

  INSERT INTO bookings (business_id, traveler_user_id, identity_id, booking_reference, service_type, origin, destination, start_date, end_date, status, notes) VALUES
    (skyline_biz, leo_id, leo_identity, 'SKY-LM-2026', 'flight', 'Lisbon (LIS)', 'Milan (MXP)', CURRENT_DATE + 14, CURRENT_DATE + 14, 'confirmed', 'Window seat, carry-on only'),
    (serena_biz, leo_id, leo_identity, 'SER-LM-2026', 'hotel', 'Florence', 'Florence', CURRENT_DATE + 16, CURRENT_DATE + 19, 'pending', 'Late check-in after 22:00'),
    (skyline_biz, hana_id, hana_identity, 'SKY-HS-2026', 'flight', 'Tokyo (HND)', 'Lisbon (LIS)', CURRENT_DATE - 30, CURRENT_DATE - 29, 'completed', 'Business class, lounge access'),
    (serena_biz, hana_id, hana_identity, 'SER-HS-2026', 'hotel', 'Florence', 'Florence', CURRENT_DATE - 28, CURRENT_DATE - 25, 'completed', 'Quiet room on a high floor');

  INSERT INTO verifications (id, business_id, traveler_user_id, identity_id, qr_token_scanned, result, verified_fields, notes, created_at)
  SELECT leo_verification, skyline_biz, leo_id, leo_identity, i.qr_token, 'verified',
    '{"full_name": true, "passport_number": true, "nationality": true}'::jsonb, 'Check-in completed at gate', now() - interval '2 days'
  FROM identities i WHERE i.id = leo_identity;

  INSERT INTO verifications (id, business_id, traveler_user_id, identity_id, qr_token_scanned, result, verified_fields, notes, created_at)
  SELECT hana_verification, serena_biz, hana_id, hana_identity, i.qr_token, 'verified',
    '{"full_name": true, "passport_number": true, "nationality": true}'::jsonb, 'Guest verified at reception', now() - interval '28 days'
  FROM identities i WHERE i.id = hana_identity;

  INSERT INTO verifications (business_id, traveler_user_id, identity_id, qr_token_scanned, result, verified_fields, notes, created_at)
  SELECT serena_biz, leo_id, leo_identity, i.qr_token, 'mismatch',
    '{"full_name": false, "passport_number": true, "nationality": true}'::jsonb, 'Surname spelled differently on booking', now() - interval '1 day'
  FROM identities i WHERE i.id = leo_identity;

  INSERT INTO mismatch_reports (verification_id, business_id, traveler_user_id, identity_id, report_reason, details, status)
  SELECT v.id, serena_biz, leo_id, leo_identity, 'Name mismatch',
    'The name on the booking reads "Marchetti Leonardo" while the passport reads "Leo Marchetti". Please confirm the correct spelling.', 'investigating'
  FROM verifications v
  WHERE v.business_id = serena_biz AND v.traveler_user_id = leo_id AND v.result = 'mismatch'
  LIMIT 1;
END $$;
