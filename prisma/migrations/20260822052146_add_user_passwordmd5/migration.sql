-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordmd5" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;
