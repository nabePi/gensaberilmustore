-- AlterTable
ALTER TABLE "HomepageSection" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "HomepageSection_categoryId_idx" ON "HomepageSection"("categoryId");

-- AddForeignKey
ALTER TABLE "HomepageSection" ADD CONSTRAINT "HomepageSection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
