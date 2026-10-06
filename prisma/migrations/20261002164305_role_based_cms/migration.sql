-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_ADMIN');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'OFFER', 'IMPORTANT', 'FESTIVE');

-- CreateEnum
CREATE TYPE "DestinationCategory" AS ENUM ('MAHARASHTRA', 'OTHER_STATES', 'PILGRIMAGE', 'FAMILY', 'GROUP', 'CORPORATE', 'OUTSTATION');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN';

-- Admins that existed before roles keep full access; new admins default to CONTENT_ADMIN
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'CONTENT_ADMIN';

-- AlterTable
ALTER TABLE "gallery_items" ADD COLUMN     "altText" VARCHAR(200);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorName" VARCHAR(80) NOT NULL,
    "actorRole" "AdminRole" NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" VARCHAR(80),
    "summary" VARCHAR(300),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "titleMr" VARCHAR(120),
    "shortDescription" VARCHAR(240) NOT NULL,
    "shortDescriptionMr" VARCHAR(240),
    "description" VARCHAR(2000),
    "descriptionMr" VARCHAR(2000),
    "label" VARCHAR(40),
    "labelMr" VARCHAR(40),
    "ctaText" VARCHAR(40),
    "ctaTextMr" VARCHAR(40),
    "ctaLink" VARCHAR(500),
    "imageUrl" VARCHAR(500),
    "imageKey" VARCHAR(300),
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "imageAlt" VARCHAR(200),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "message" VARCHAR(200) NOT NULL,
    "messageMr" VARCHAR(200),
    "ctaText" VARCHAR(40),
    "ctaTextMr" VARCHAR(40),
    "ctaLink" VARCHAR(500),
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "key" VARCHAR(40) NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "nameMr" VARCHAR(80),
    "state" VARCHAR(80),
    "country" VARCHAR(80) NOT NULL DEFAULT 'India',
    "shortDescription" VARCHAR(240) NOT NULL,
    "shortDescriptionMr" VARCHAR(240),
    "description" VARCHAR(2000),
    "descriptionMr" VARCHAR(2000),
    "category" "DestinationCategory" NOT NULL,
    "imageUrl" VARCHAR(500),
    "imageKey" VARCHAR(300),
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "imageAlt" VARCHAR(200),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "titleMr" VARCHAR(80),
    "shortDescription" VARCHAR(240) NOT NULL,
    "shortDescriptionMr" VARCHAR(240),
    "description" VARCHAR(2000),
    "descriptionMr" VARCHAR(2000),
    "suitableFor" VARCHAR(1000),
    "suitableForMr" VARCHAR(1000),
    "enquiryType" "TravelType" NOT NULL,
    "icon" VARCHAR(30) NOT NULL DEFAULT 'route',
    "imageUrl" VARCHAR(500),
    "imageKey" VARCHAR(300),
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "imageAlt" VARCHAR(200),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_createdAt_idx" ON "audit_logs"("entityType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "offers_published_startsAt_endsAt_idx" ON "offers"("published", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "announcements_published_startsAt_endsAt_idx" ON "announcements"("published", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "destinations_published_category_sortOrder_idx" ON "destinations"("published", "category", "sortOrder");

-- CreateIndex
CREATE INDEX "services_published_sortOrder_idx" ON "services"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "admins_role_isActive_idx" ON "admins"("role", "isActive");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data rules the application also enforces, kept here as a last line of defence
ALTER TABLE "offers"
  ADD CONSTRAINT "offers_title_not_blank" CHECK (char_length(btrim("title")) > 0),
  ADD CONSTRAINT "offers_dates_ordered" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt"),
  ADD CONSTRAINT "offers_image_url_local" CHECK ("imageUrl" IS NULL OR "imageUrl" ~ '^/(media|images)/');

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_message_not_blank" CHECK (char_length(btrim("message")) > 0),
  ADD CONSTRAINT "announcements_dates_ordered" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt");

ALTER TABLE "destinations"
  ADD CONSTRAINT "destinations_name_not_blank" CHECK (char_length(btrim("name")) > 0),
  ADD CONSTRAINT "destinations_image_url_local" CHECK ("imageUrl" IS NULL OR "imageUrl" ~ '^/(media|images)/');

ALTER TABLE "services"
  ADD CONSTRAINT "services_title_not_blank" CHECK (char_length(btrim("title")) > 0),
  ADD CONSTRAINT "services_image_url_local" CHECK ("imageUrl" IS NULL OR "imageUrl" ~ '^/(media|images)/');

ALTER TABLE "site_content"
  ADD CONSTRAINT "site_content_key_format" CHECK ("key" ~ '^[a-z][a-z0-9_]{0,39}$');
