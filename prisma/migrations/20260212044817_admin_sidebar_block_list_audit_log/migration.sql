-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "customAnalysisModel" VARCHAR(100),
ADD COLUMN     "customRewriteModel" VARCHAR(100);

-- AlterTable
ALTER TABLE "submitters" ADD COLUMN     "blockAction" VARCHAR(10),
ADD COLUMN     "block_reason" VARCHAR(200),
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedBy" VARCHAR(50),
ADD COLUMN     "blocked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "post_id" TEXT,
    "target_id" TEXT,
    "modUser" VARCHAR(50) NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_modUser_idx" ON "audit_logs"("modUser");
