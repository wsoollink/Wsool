-- AlterTable
ALTER TABLE "portfolio_items" ADD COLUMN     "link_url" TEXT,
ALTER COLUMN "video_url" DROP NOT NULL;


-- Every work is either an uploaded video or a link.
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_video_or_link" CHECK ("video_url" IS NOT NULL OR "link_url" IS NOT NULL);
