-- CreateEnum
CREATE TYPE "HomepageBannerSlot" AS ENUM ('HERO_MAIN', 'HERO_SIDE_1', 'HERO_SIDE_2');

-- CreateTable
CREATE TABLE "HomepageBanner" (
    "id" TEXT NOT NULL,
    "slot" "HomepageBannerSlot" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageBanner_slot_position_idx" ON "HomepageBanner"("slot", "position");

-- AlterTable
ALTER TABLE "HomepageConfig" DROP COLUMN "heroMainImageUrl",
DROP COLUMN "heroSideImage1Url",
DROP COLUMN "heroSideImage2Url";
