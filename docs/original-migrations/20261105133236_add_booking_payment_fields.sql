/*
# Add payment details to bookings (InstaPay and Vodafone Cash)

## Overview
Lets a business record the value of a trip for each scanned traveler and how it was paid.
Payments are recorded manually: the business enters the InstaPay or Vodafone Cash
transaction reference after receiving the money.

## Modified Table: bookings
- amount (numeric 12,2, nullable): total value of the travel. Must be zero or more.
- currency (text, default 'EGP'): currency of the amount.
- payment_method (text, nullable): 'instapay' or 'vodafone_cash'.
- payment_reference (text, nullable): transaction reference from the payment app.
- payment_status (text, default 'unpaid'): 'unpaid' or 'paid'.
- paid_at (timestamptz, nullable): when the payment was recorded as paid.

## Security
- No policy or grant changes. Existing booking policies already restrict inserts and updates
  to the owning business and reads to the traveler, the business and admins.
- Existing rows are unchanged; the new columns start empty.
*/

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount numeric(12,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_amount_nonnegative') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_amount_nonnegative CHECK (amount IS NULL OR amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('instapay', 'vodafone_cash'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;
END $$;
