-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationName" VARCHAR(200),
ADD COLUMN     "longitude" DOUBLE PRECISION;
