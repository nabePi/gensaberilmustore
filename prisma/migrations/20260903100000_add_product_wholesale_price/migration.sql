-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "wholesalePrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "wholesaleMinQty" INTEGER;
