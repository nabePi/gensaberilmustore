-- CreateEnum
CREATE TYPE "AffiliateConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "AffiliateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "payoutBankName" TEXT NOT NULL,
    "payoutBankAccount" TEXT NOT NULL,
    "payoutBankHolder" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateProductSelection" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateProductSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCommissionRate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "fixedAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateCommissionRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "productId" TEXT,
    "sourceUrl" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateConversion" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "status" "AffiliateConversionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePayout" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliatePayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProfile_userId_key" ON "AffiliateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProfile_code_key" ON "AffiliateProfile"("code");

-- CreateIndex
CREATE INDEX "AffiliateProfile_code_idx" ON "AffiliateProfile"("code");

-- CreateIndex
CREATE INDEX "AffiliateProductSelection_affiliateProfileId_createdAt_idx" ON "AffiliateProductSelection"("affiliateProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateProductSelection_productId_idx" ON "AffiliateProductSelection"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProductSelection_affiliateProfileId_productId_key" ON "AffiliateProductSelection"("affiliateProfileId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommissionRate_productId_key" ON "AffiliateCommissionRate"("productId");

-- CreateIndex
CREATE INDEX "AffiliateCommissionRate_productId_idx" ON "AffiliateCommissionRate"("productId");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateProfileId_createdAt_idx" ON "AffiliateClick"("affiliateProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_idx" ON "AffiliateClick"("productId");

-- CreateIndex
CREATE INDEX "AffiliateClick_cookieId_idx" ON "AffiliateClick"("cookieId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateConversion_orderId_key" ON "AffiliateConversion"("orderId");

-- CreateIndex
CREATE INDEX "AffiliateConversion_affiliateProfileId_createdAt_idx" ON "AffiliateConversion"("affiliateProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateConversion_status_idx" ON "AffiliateConversion"("status");

-- CreateIndex
CREATE INDEX "AffiliatePayout_affiliateProfileId_createdAt_idx" ON "AffiliatePayout"("affiliateProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliatePayout_status_idx" ON "AffiliatePayout"("status");

-- AddForeignKey
ALTER TABLE "AffiliateProfile" ADD CONSTRAINT "AffiliateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateProductSelection" ADD CONSTRAINT "AffiliateProductSelection_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateProductSelection" ADD CONSTRAINT "AffiliateProductSelection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommissionRate" ADD CONSTRAINT "AffiliateCommissionRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommissionRate" ADD CONSTRAINT "AffiliateCommissionRate_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayout" ADD CONSTRAINT "AffiliatePayout_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
