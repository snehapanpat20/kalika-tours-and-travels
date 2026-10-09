-- Offer photo placement. Additive only: existing offers show their whole image, centred.
CREATE TYPE "OfferImageFit" AS ENUM ('WHOLE', 'FILL');

ALTER TABLE "offers"
  ADD COLUMN "imageFit" "OfferImageFit" NOT NULL DEFAULT 'WHOLE',
  ADD COLUMN "imageFocusX" SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN "imageFocusY" SMALLINT NOT NULL DEFAULT 50;

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_image_focus_range" CHECK ("imageFocusX" BETWEEN 0 AND 100 AND "imageFocusY" BETWEEN 0 AND 100);
