-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProofUrl" TEXT,
ADD COLUMN     "paymentProofUploadedAt" TIMESTAMP(3);
