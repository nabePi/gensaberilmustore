-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "airwaybillNumber" TEXT,
ADD COLUMN     "shippingService" TEXT NOT NULL DEFAULT 'REG',
ADD COLUMN     "weightKg" INTEGER NOT NULL DEFAULT 0;
