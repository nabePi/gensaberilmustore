-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "posCashierUserId" TEXT,
ADD COLUMN     "posReceiptPrintedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "POSSession" (
    "id" TEXT NOT NULL,
    "cashierUserId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" INTEGER NOT NULL,
    "closingCash" INTEGER,
    "notes" TEXT,

    CONSTRAINT "POSSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "POSSession_cashierUserId_openedAt_idx" ON "POSSession"("cashierUserId", "openedAt");

-- CreateIndex
CREATE INDEX "Order_posCashierUserId_idx" ON "Order"("posCashierUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_posCashierUserId_fkey" FOREIGN KEY ("posCashierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSession" ADD CONSTRAINT "POSSession_cashierUserId_fkey" FOREIGN KEY ("cashierUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
