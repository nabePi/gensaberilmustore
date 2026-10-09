-- CreateEnum
CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "AffiliateWithdrawal" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AffiliateWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "bankName" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "bankHolder" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AffiliateWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateWithdrawal_affiliateProfileId_requestedAt_idx" ON "AffiliateWithdrawal"("affiliateProfileId", "requestedAt");

-- CreateIndex
CREATE INDEX "AffiliateWithdrawal_status_idx" ON "AffiliateWithdrawal"("status");

-- AddForeignKey
ALTER TABLE "AffiliateWithdrawal" ADD CONSTRAINT "AffiliateWithdrawal_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
