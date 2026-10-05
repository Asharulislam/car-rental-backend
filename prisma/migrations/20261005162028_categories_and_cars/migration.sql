/*
  Warnings:

  - The primary key for the `cars` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `cars` table. All the data in the column will be lost.
  - You are about to alter the column `price_per_day` on the `cars` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - Added the required column `brand` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doors` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fuel` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mileage_limit_km` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seats` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transmission` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `cars` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `cars` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('petrol', 'diesel', 'hybrid', 'electric');

-- AlterTable
ALTER TABLE "cars" DROP CONSTRAINT "cars_pkey",
DROP COLUMN "name",
ADD COLUMN     "air_conditioner" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "category_id" UUID NOT NULL,
ADD COLUMN     "doors" INTEGER NOT NULL,
ADD COLUMN     "equipment" TEXT[],
ADD COLUMN     "fuel" "FuelType" NOT NULL,
ADD COLUMN     "gallery" TEXT[],
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "mileage_limit_km" INTEGER NOT NULL,
ADD COLUMN     "seats" INTEGER NOT NULL,
ADD COLUMN     "transmission" "Transmission" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "price_per_day" SET DATA TYPE DECIMAL(10,2),
ADD CONSTRAINT "cars_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "cars_category_id_idx" ON "cars"("category_id");

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
