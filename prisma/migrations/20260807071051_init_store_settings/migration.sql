-- CreateEnum
CREATE TYPE "HomepageSectionKey" AS ENUM ('NEWEST', 'BESTSELLER', 'INTERNATIONAL', 'KIWARI', 'KLASIK', 'OTHERS');

-- CreateEnum
CREATE TYPE "KidsSectionKey" AS ENUM ('POPULAR', 'DISCOUNT');

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "defaultShippingCost" INTEGER NOT NULL,
    "freeShippingMinTotal" INTEGER NOT NULL,
    "bank1Name" TEXT NOT NULL,
    "bank1Number" TEXT NOT NULL,
    "bank1Holder" TEXT NOT NULL,
    "bank2Name" TEXT NOT NULL,
    "bank2Number" TEXT NOT NULL,
    "bank2Holder" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heroMainImageUrl" TEXT NOT NULL,
    "heroSideImage1Url" TEXT NOT NULL,
    "heroSideImage2Url" TEXT NOT NULL,
    "sectionNewestPromoImageUrl" TEXT NOT NULL,
    "sectionBestsellerPromoImageUrl" TEXT NOT NULL,
    "sectionInternationalPromoImageUrl" TEXT NOT NULL,
    "sectionKiwariPromoImageUrl" TEXT NOT NULL,
    "sectionKlasikPromoImageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSectionProduct" (
    "id" TEXT NOT NULL,
    "sectionKey" "HomepageSectionKey" NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HomepageSectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heroBadge" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroDescription" TEXT NOT NULL,
    "heroImageUrl" TEXT NOT NULL,
    "promoBadge" TEXT NOT NULL,
    "promoTitle" TEXT NOT NULL,
    "promoDescription" TEXT NOT NULL,
    "promoImageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsSectionProduct" (
    "id" TEXT NOT NULL,
    "sectionKey" "KidsSectionKey" NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KidsSectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageSectionProduct_sectionKey_position_idx" ON "HomepageSectionProduct"("sectionKey", "position");

-- CreateIndex
CREATE INDEX "HomepageSectionProduct_productId_idx" ON "HomepageSectionProduct"("productId");

-- CreateIndex
CREATE INDEX "KidsSectionProduct_sectionKey_position_idx" ON "KidsSectionProduct"("sectionKey", "position");

-- CreateIndex
CREATE INDEX "KidsSectionProduct_productId_idx" ON "KidsSectionProduct"("productId");

-- AddForeignKey
ALTER TABLE "HomepageSectionProduct" ADD CONSTRAINT "HomepageSectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsSectionProduct" ADD CONSTRAINT "KidsSectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
