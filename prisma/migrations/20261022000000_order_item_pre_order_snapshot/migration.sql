ALTER TABLE "OrderItem" ADD COLUMN "isPreOrderSnapshot" BOOLEAN NOT NULL DEFAULT false;

-- Historical checkout state is unavailable; preserve current PO flags on existing orders.
UPDATE "OrderItem" AS item
SET "isPreOrderSnapshot" = product."isPreOrderActive"
FROM "Product" AS product
WHERE item."productId" = product.id AND product."isPreOrderActive" = true;
