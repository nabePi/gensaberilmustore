-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('JNE', 'SELF_PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingMethod" "ShippingMethod" NOT NULL DEFAULT 'JNE';
