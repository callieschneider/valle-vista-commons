-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "descHistory" JSONB;
