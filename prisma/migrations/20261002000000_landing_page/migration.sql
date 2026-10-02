-- CreateTable
CREATE TABLE "LandingDraft" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "baseSha" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPublishLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "commitSha" TEXT,
    "commitUrl" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPublishLog_createdAt_idx" ON "LandingPublishLog"("createdAt");
