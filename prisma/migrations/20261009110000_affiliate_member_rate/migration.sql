-- CreateTable
CREATE TABLE "AffiliateMemberRate" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "percent" DECIMAL(5,2),
    "fixedAmount" INTEGER,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateMemberRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateMemberRate_productId_idx" ON "AffiliateMemberRate"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateMemberRate_affiliateProfileId_productId_key" ON "AffiliateMemberRate"("affiliateProfileId", "productId");

-- AddForeignKey
ALTER TABLE "AffiliateMemberRate" ADD CONSTRAINT "AffiliateMemberRate_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMemberRate" ADD CONSTRAINT "AffiliateMemberRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
