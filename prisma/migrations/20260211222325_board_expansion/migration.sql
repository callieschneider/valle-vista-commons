/*
  Warnings:

  - You are about to drop the column `tag` on the `posts` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Section" AS ENUM ('ALERT', 'HAPPENINGS', 'LOST_FOUND', 'NEIGHBORS', 'BOARD_NOTES');

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "tag",
ADD COLUMN     "aiAnalysis" JSONB,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "modNote" TEXT,
ADD COLUMN     "modPost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "section" "Section" NOT NULL DEFAULT 'NEIGHBORS',
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "location" DROP NOT NULL;

-- DropEnum
DROP TYPE "Tag";

-- CreateTable
CREATE TABLE "mods" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passHash" VARCHAR(64) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "boardName" TEXT NOT NULL DEFAULT 'Valle Vista Commons',
    "boardTagline" TEXT NOT NULL DEFAULT 'Your neighborhood board',
    "analysisModel" TEXT NOT NULL DEFAULT 'anthropic/claude-3.5-haiku',
    "rewriteModel" TEXT NOT NULL DEFAULT 'anthropic/claude-3.5-haiku',
    "aboutText" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mods_username_key" ON "mods"("username");
