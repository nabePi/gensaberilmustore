-- CreateEnum
CREATE TYPE "AffiliateDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "AffiliateCommissionRate" ADD COLUMN     "discountAmount" INTEGER,
ADD COLUMN     "discountPercent" DECIMAL(5,2),
ADD COLUMN     "discountType" "AffiliateDiscountType",
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "affiliateDiscount" INTEGER NOT NULL DEFAULT 0;
