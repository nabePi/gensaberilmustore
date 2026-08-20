/*
  Warnings:

  - You are about to drop the `KidsSectionProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "KidsSectionTheme" AS ENUM ('CREAM', 'MINT', 'CORAL', 'YELLOW', 'LAVENDER');

-- CreateTable
CREATE TABLE "KidsBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "theme" "KidsSectionTheme" NOT NULL DEFAULT 'MINT',
    "showDiscountTag" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KidsSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KidsBanner_position_idx" ON "KidsBanner"("position");

-- CreateIndex
CREATE INDEX "KidsSection_position_idx" ON "KidsSection"("position");

-- CreateIndex
CREATE INDEX "KidsSectionItem_sectionId_position_idx" ON "KidsSectionItem"("sectionId", "position");

-- CreateIndex
CREATE INDEX "KidsSectionItem_productId_idx" ON "KidsSectionItem"("productId");

-- AddForeignKey
ALTER TABLE "KidsSectionItem" ADD CONSTRAINT "KidsSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "KidsSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsSectionItem" ADD CONSTRAINT "KidsSectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing enum-based sections into dynamic sections
INSERT INTO "KidsSection" ("id", "title", "subtitle", "badge", "theme", "showDiscountTag", "position", "updatedAt")
SELECT * FROM (
  SELECT gen_random_uuid()::text, 'Buku Populer Anak', 'Koleksi cerita dan edukasi yang bikin si kecil semangat belajar', 'Paling Disukai', 'MINT'::"KidsSectionTheme", false, 0, CURRENT_TIMESTAMP
  UNION ALL
  SELECT gen_random_uuid()::text, 'Buku Diskon', 'Dapatkan buku favorit si kecil dengan harga spesial, stok terbatas!', 'Murah Meriah', 'CORAL'::"KidsSectionTheme", true, 1, CURRENT_TIMESTAMP
) AS defaults
WHERE NOT EXISTS (SELECT 1 FROM "KidsSection");

-- Copy existing section product assignments
INSERT INTO "KidsSectionItem" ("id", "sectionId", "productId", "position")
SELECT gen_random_uuid()::text, s."id", ksp."productId", ksp."position"
FROM "KidsSectionProduct" ksp
JOIN "KidsSection" s ON s."position" = CASE ksp."sectionKey" WHEN 'POPULAR' THEN 0 WHEN 'DISCOUNT' THEN 1 END;

-- DropForeignKey
ALTER TABLE "KidsSectionProduct" DROP CONSTRAINT "KidsSectionProduct_productId_fkey";

-- DropTable
DROP TABLE "KidsSectionProduct";

-- DropEnum
DROP TYPE "KidsSectionKey";
