-- CreateEnum
CREATE TYPE "VoucherVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "visibility" "VoucherVisibility" NOT NULL DEFAULT 'PRIVATE';
