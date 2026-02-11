-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('VEHICLE', 'PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'LIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "desc" VARCHAR(500) NOT NULL,
    "location" VARCHAR(50) NOT NULL,
    "tag" "Tag" NOT NULL DEFAULT 'OTHER',
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);
