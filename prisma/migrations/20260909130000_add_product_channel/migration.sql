-- CreateEnum
CREATE TYPE "ProductChannel" AS ENUM ('WEB', 'POS', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "channel" "ProductChannel" NOT NULL DEFAULT 'BOTH';

-- CreateIndex
CREATE INDEX "Product_channel_idx" ON "Product"("channel");
