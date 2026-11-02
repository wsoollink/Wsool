-- CreateEnum
CREATE TYPE "AgencyKind" AS ENUM ('agency', 'brand');

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "kind" "AgencyKind" NOT NULL DEFAULT 'agency';

-- CreateTable
CREATE TABLE "directory_stats" (
    "page_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "opens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "directory_stats_pkey" PRIMARY KEY ("page_id","day")
);

-- AddForeignKey
ALTER TABLE "directory_stats" ADD CONSTRAINT "directory_stats_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Directory listing: published pages that opted in.
CREATE INDEX "pages_in_directory_idx" ON "pages"("in_directory") WHERE "in_directory";

-- Server only: RLS on, no policies.
ALTER TABLE "directory_stats" ENABLE ROW LEVEL SECURITY;
