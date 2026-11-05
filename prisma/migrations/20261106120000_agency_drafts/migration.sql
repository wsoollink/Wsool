-- Agencies prepare pages for new creators (owner, Nov 2026): draft links + placeholder accounts until the creator claims the page.
-- AlterEnum
ALTER TYPE "LinkStatus" ADD VALUE 'draft';

-- AlterTable
ALTER TABLE "agency_links" ADD COLUMN     "draft_email" VARCHAR(254),
ADD COLUMN     "draft_expires_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "placeholder" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "agency_links_draft_email_idx" ON "agency_links"("draft_email");

