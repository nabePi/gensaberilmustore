-- CreateEnum
CREATE TYPE "HomepageSectionType" AS ENUM ('REGULAR', 'PROMO');

-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN "discountEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HomepageSection"
  ADD COLUMN "type" "HomepageSectionType" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSectionProduct_sectionId_productId_key" ON "HomepageSectionProduct"("sectionId", "productId");
