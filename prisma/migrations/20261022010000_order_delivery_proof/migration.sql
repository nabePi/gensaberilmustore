ALTER TABLE "Order"
ADD COLUMN "deliveryPhotoUrl" TEXT,
ADD COLUMN "deliveryReceiverName" TEXT,
ADD COLUMN "deliveryReceiverRelation" TEXT,
ADD COLUMN "deliveryConfirmedAt" TIMESTAMP(3);
