-- Newsletter issues written and sent from the admin panel (staff only, server-side).
-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'sending', 'sent');

-- CreateTable
CREATE TABLE "newsletter_campaigns" (
    "id" UUID NOT NULL,
    "subject_ar" VARCHAR(150) NOT NULL DEFAULT '',
    "body_ar" TEXT NOT NULL DEFAULT '',
    "subject_en" VARCHAR(150) NOT NULL DEFAULT '',
    "body_en" TEXT NOT NULL DEFAULT '',
    "cta_label_ar" VARCHAR(40) NOT NULL DEFAULT '',
    "cta_label_en" VARCHAR(40) NOT NULL DEFAULT '',
    "cta_url" VARCHAR(500) NOT NULL DEFAULT '',
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "started_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_deliveries" (
    "campaign_id" UUID NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'sending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_deliveries_pkey" PRIMARY KEY ("campaign_id","subscriber_id")
);

-- CreateIndex
CREATE INDEX "newsletter_campaigns_created_at_idx" ON "newsletter_campaigns"("created_at");

-- CreateIndex
CREATE INDEX "newsletter_deliveries_subscriber_id_idx" ON "newsletter_deliveries"("subscriber_id");

-- AddForeignKey
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "newsletter_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Staff-only tables: RLS on, no policies, no Data API access.
ALTER TABLE "newsletter_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "newsletter_deliveries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "newsletter_campaigns" FROM anon, authenticated;
REVOKE ALL ON "newsletter_deliveries" FROM anon, authenticated;
