-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('pending', 'confirmed', 'unsubscribed');

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'pending',
    "source" VARCHAR(40) NOT NULL DEFAULT 'home',
    "confirm_sent_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "unsubscribed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers"("status");

-- Emails are stored lowercased (no duplicates).
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_email_lower" CHECK ("email" = lower("email"));

-- Server only: RLS on, no policies, no Data API access.
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "newsletter_subscribers" FROM anon, authenticated;
