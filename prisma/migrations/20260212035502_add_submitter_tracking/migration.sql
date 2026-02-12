-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "submitter_id" INTEGER;

-- CreateTable
CREATE TABLE "submitters" (
    "id" SERIAL NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submitters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submitters_hash_key" ON "submitters"("hash");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
