-- AlterTable
ALTER TABLE "mods" ADD COLUMN     "rewriteEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rewriteLimitPerHour" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "rewriteLimitPerPost" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "rewriteCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "rewritePrompt" TEXT;

-- CreateTable
CREATE TABLE "rewrite_logs" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "mod_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewrite_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rewrite_logs_post_id_idx" ON "rewrite_logs"("post_id");

-- CreateIndex
CREATE INDEX "rewrite_logs_mod_id_idx" ON "rewrite_logs"("mod_id");

-- CreateIndex
CREATE INDEX "rewrite_logs_created_at_idx" ON "rewrite_logs"("created_at");

-- AddForeignKey
ALTER TABLE "rewrite_logs" ADD CONSTRAINT "rewrite_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewrite_logs" ADD CONSTRAINT "rewrite_logs_mod_id_fkey" FOREIGN KEY ("mod_id") REFERENCES "mods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
