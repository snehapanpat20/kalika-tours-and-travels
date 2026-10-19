-- Enquiries can now be for groups of up to 60 (the whole fleet, not only the 20 seater
-- Traveller). Mirrors businessRules.maxGroupSize; only widens the range, so every
-- existing enquiry stays valid.

ALTER TABLE "enquiries"
  DROP CONSTRAINT "enquiries_passenger_count",
  ADD CONSTRAINT "enquiries_passenger_count" CHECK ("passengerCount" BETWEEN 1 AND 60);
