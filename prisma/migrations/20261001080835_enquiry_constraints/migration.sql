-- Database-level guards that mirror the API validation.
-- They keep impossible data out even if a future code path skips validation.

ALTER TABLE "enquiries"
  ADD CONSTRAINT "enquiries_full_name_length" CHECK (char_length(btrim("fullName")) BETWEEN 2 AND 80),
  ADD CONSTRAINT "enquiries_phone_e164" CHECK ("phone" ~ '^\+91[6-9][0-9]{9}$'),
  ADD CONSTRAINT "enquiries_destination_length" CHECK (char_length(btrim("destination")) BETWEEN 2 AND 120),
  ADD CONSTRAINT "enquiries_passenger_count" CHECK ("passengerCount" BETWEEN 1 AND 20),
  ADD CONSTRAINT "enquiries_return_after_travel" CHECK ("returnDate" >= "travelDate"),
  ADD CONSTRAINT "enquiries_locale" CHECK ("locale" IN ('en', 'mr'));

ALTER TABLE "admins"
  ADD CONSTRAINT "admins_email_lowercase" CHECK ("email" = lower("email"));
