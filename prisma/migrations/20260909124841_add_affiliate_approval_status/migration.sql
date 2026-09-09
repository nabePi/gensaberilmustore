-- CreateEnum
CREATE TYPE "AffiliateApprovalStatus" AS ENUM ('PENDING', 'APPROVED');

-- AlterTable
ALTER TABLE "AffiliateProfile" ADD COLUMN     "status" "AffiliateApprovalStatus" NOT NULL DEFAULT 'PENDING';
