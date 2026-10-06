-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" UUID NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "imageKey" VARCHAR(300),
    "width" INTEGER,
    "height" INTEGER,
    "title" VARCHAR(120) NOT NULL,
    "caption" VARCHAR(500),
    "destination" VARCHAR(120),
    "tripType" "TravelType",
    "tripDate" DATE,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "customerName" VARCHAR(60) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "reviewText" VARCHAR(1500) NOT NULL,
    "destination" VARCHAR(120) NOT NULL,
    "tripType" "TravelType",
    "photoUrl" VARCHAR(500),
    "photoKey" VARCHAR(300),
    "photoWidth" INTEGER,
    "photoHeight" INTEGER,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_items_published_sortOrder_idx" ON "gallery_items"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "gallery_items_featured_published_idx" ON "gallery_items"("featured", "published");

-- CreateIndex
CREATE INDEX "reviews_status_createdAt_idx" ON "reviews"("status", "createdAt" DESC);

-- Database-level guards that mirror the API validation
ALTER TABLE "gallery_items"
  ADD CONSTRAINT "gallery_items_title_length" CHECK (char_length(btrim("title")) BETWEEN 1 AND 120),
  ADD CONSTRAINT "gallery_items_image_url_local" CHECK ("imageUrl" ~ '^/(media|images)/'),
  ADD CONSTRAINT "gallery_items_dimensions" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_customer_name_length" CHECK (char_length(btrim("customerName")) BETWEEN 2 AND 60),
  ADD CONSTRAINT "reviews_text_length" CHECK (char_length(btrim("reviewText")) BETWEEN 10 AND 1500),
  ADD CONSTRAINT "reviews_photo_url_local" CHECK ("photoUrl" IS NULL OR "photoUrl" ~ '^/media/'),
  ADD CONSTRAINT "reviews_locale" CHECK ("locale" IN ('en', 'mr'));
