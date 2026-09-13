-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "subdistrictName" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "tariffCode" TEXT NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Destination_provinceName_idx" ON "Destination"("provinceName");

-- CreateIndex
CREATE INDEX "Destination_provinceName_cityName_idx" ON "Destination"("provinceName", "cityName");

-- CreateIndex
CREATE INDEX "Destination_provinceName_cityName_districtName_idx" ON "Destination"("provinceName", "cityName", "districtName");

-- CreateIndex
CREATE INDEX "Destination_zipCode_idx" ON "Destination"("zipCode");

-- CreateIndex
CREATE INDEX "Destination_tariffCode_idx" ON "Destination"("tariffCode");

-- DropForeignKey
ALTER TABLE "Receiver" DROP CONSTRAINT "Receiver_cityId_fkey";

-- DropIndex
DROP INDEX "Receiver_cityId_idx";

-- Existing receivers reference the old City table and cannot be mapped to a
-- specific Destination row automatically; clear them (dev data only, no
-- backfill data source available).
DELETE FROM "Receiver";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "receiverCity",
ADD COLUMN     "destinationId" TEXT;

-- AlterTable
ALTER TABLE "Receiver" DROP COLUMN "cityId",
ADD COLUMN     "destinationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Order_destinationId_idx" ON "Order"("destinationId");

-- CreateIndex
CREATE INDEX "Receiver_destinationId_idx" ON "Receiver"("destinationId");

-- AddForeignKey
ALTER TABLE "Receiver" ADD CONSTRAINT "Receiver_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
