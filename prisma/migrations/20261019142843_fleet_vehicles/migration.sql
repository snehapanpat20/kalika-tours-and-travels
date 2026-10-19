-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('TRAVELLER', 'BUS', 'SLEEPER_BUS', 'CAR');

-- CreateEnum
CREATE TYPE "VehicleAc" AS ENUM ('AC', 'NON_AC', 'BOTH');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(40),
    "name" VARCHAR(80) NOT NULL,
    "nameMr" VARCHAR(80),
    "capacity" INTEGER,
    "ac" "VehicleAc",
    "category" "VehicleCategory" NOT NULL,
    "pushBackSeats" BOOLEAN NOT NULL DEFAULT false,
    "seatingType" VARCHAR(120),
    "seatingTypeMr" VARCHAR(120),
    "description" VARCHAR(600),
    "descriptionMr" VARCHAR(600),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_photos" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "key" VARCHAR(300),
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "alt" VARCHAR(200),
    "altMr" VARCHAR(200),
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_key_key" ON "vehicles"("key");

-- CreateIndex
CREATE INDEX "vehicles_published_sortOrder_idx" ON "vehicles"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "vehicle_photos_vehicleId_sortOrder_idx" ON "vehicle_photos"("vehicleId", "sortOrder");

-- AddForeignKey
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
