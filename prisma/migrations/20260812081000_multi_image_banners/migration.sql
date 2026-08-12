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

-- Migrate existing banner URLs to new HomepageBanner table
INSERT INTO "HomepageBanner" ("id", "slot", "imageUrl", "linkUrl", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'HERO_MAIN', "heroMainImageUrl", NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomepageConfig"
WHERE "heroMainImageUrl" IS NOT NULL AND "heroMainImageUrl" != '';

INSERT INTO "HomepageBanner" ("id", "slot", "imageUrl", "linkUrl", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'HERO_SIDE_1', "heroSideImage1Url", NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomepageConfig"
WHERE "heroSideImage1Url" IS NOT NULL AND "heroSideImage1Url" != '';

INSERT INTO "HomepageBanner" ("id", "slot", "imageUrl", "linkUrl", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'HERO_SIDE_2', "heroSideImage2Url", NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomepageConfig"
WHERE "heroSideImage2Url" IS NOT NULL AND "heroSideImage2Url" != '';

-- AlterTable
ALTER TABLE "HomepageConfig" DROP COLUMN "heroMainImageUrl",
DROP COLUMN "heroSideImage1Url",
DROP COLUMN "heroSideImage2Url";
