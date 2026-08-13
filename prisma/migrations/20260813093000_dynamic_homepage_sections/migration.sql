-- DropIndex
DROP INDEX IF EXISTS "HomepageSectionProduct_sectionKey_position_idx";

-- Drop promo image columns from HomepageConfig (replaced by HomepageSection)
ALTER TABLE "HomepageConfig" DROP COLUMN IF EXISTS "sectionBestsellerPromoImageUrl",
DROP COLUMN IF EXISTS "sectionInternationalPromoImageUrl",
DROP COLUMN IF EXISTS "sectionKiwariPromoImageUrl",
DROP COLUMN IF EXISTS "sectionKlasikPromoImageUrl",
DROP COLUMN IF EXISTS "sectionNewestPromoImageUrl";

-- Add nullable sectionId column while keeping old enum column for data migration
ALTER TABLE "HomepageSectionProduct" ADD COLUMN IF NOT EXISTS "sectionId" TEXT NULL;

-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "promoImageUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_position_idx" ON "HomepageSection"("position");

-- Insert default homepage sections
INSERT INTO "HomepageSection" ("id", "key", "title", "subtitle", "promoImageUrl", "position", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'newest', 'Buku Terbaru', 'Rilisan terbaru dari GenSa Berilmu', '', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'bestseller', 'Bestseller', 'Paling banyak dicari pembaca', '', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'international', 'International Bestseller', 'Karya penulis dunia pilihan', '', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'kiwari', 'Keislaman Kiwari', 'Wawasan Islam kontemporer', '', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'klasik', 'Rujukan Islam Klasik', 'Karya ulama klasik terpercaya', '', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'others', 'Lainnya', 'Koleksi pilihan lainnya', '', 5, CURRENT_TIMESTAMP);

-- Migrate existing rows from enum sectionKey to new sectionId
UPDATE "HomepageSectionProduct" p
SET "sectionId" = s."id"
FROM "HomepageSection" s
WHERE p."sectionId" IS NULL AND LOWER(p."sectionKey"::text) = s."key";

-- Drop old column and enum
ALTER TABLE "HomepageSectionProduct" DROP COLUMN IF EXISTS "sectionKey";
DROP TYPE IF EXISTS "HomepageSectionKey";

-- Make sectionId NOT NULL and add FK
ALTER TABLE "HomepageSectionProduct" ALTER COLUMN "sectionId" SET NOT NULL;
ALTER TABLE "HomepageSectionProduct" ADD CONSTRAINT "HomepageSectionProduct_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "HomepageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create new index
CREATE INDEX "HomepageSectionProduct_sectionId_position_idx" ON "HomepageSectionProduct"("sectionId", "position");
