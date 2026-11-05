-- Newsletter lists (owner, Nov 2026): creators list + agencies list, and who each issue goes to.
-- CreateEnum
CREATE TYPE "NewsletterAudience" AS ENUM ('creators', 'agencies', 'all');

-- AlterTable
ALTER TABLE "newsletter_campaigns" ADD COLUMN     "audience" "NewsletterAudience" NOT NULL DEFAULT 'creators';

-- AlterTable
ALTER TABLE "newsletter_subscribers" ADD COLUMN     "agencies" BOOLEAN,
ADD COLUMN     "creators" BOOLEAN;

-- Everyone who signed up so far did it on the home page (creators). Pending addresses join on confirming.
UPDATE "newsletter_subscribers" SET "creators" = true WHERE "status" = 'confirmed';
UPDATE "newsletter_subscribers" SET "creators" = false WHERE "status" = 'unsubscribed';
