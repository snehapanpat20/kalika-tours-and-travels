-- Destination pages: a web address (slug) and optional search-result title/description.
-- Additive only: existing destinations keep all their data and get a slug from their name.

ALTER TABLE "destinations"
  ADD COLUMN "slug" VARCHAR(80),
  ADD COLUMN "seoTitle" VARCHAR(70),
  ADD COLUMN "seoDescription" VARCHAR(170);

-- "12 Jyotirlinga" -> "12-jyotirlinga"; repeats get -2, -3 …
UPDATE "destinations" AS d
SET "slug" = s.slug
FROM (
  SELECT id, base || CASE WHEN rn > 1 THEN '-' || rn ELSE '' END AS slug
  FROM (
    SELECT id, base, row_number() OVER (PARTITION BY base ORDER BY "createdAt", id) AS rn
    FROM (
      SELECT id, "createdAt",
             COALESCE(NULLIF(btrim(lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')), '-'), ''), 'destination') AS base
      FROM "destinations"
    ) named
  ) numbered
) AS s
WHERE d.id = s.id;

ALTER TABLE "destinations" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

ALTER TABLE "destinations"
  ADD CONSTRAINT "destinations_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
