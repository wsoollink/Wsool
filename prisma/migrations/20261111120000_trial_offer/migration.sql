-- End-of-trial offer (owner, Nov 2026): yearly-only codes, one offer per account, and a settings table for the on/off switch.

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "offer_user_id" UUID,
ADD COLUMN     "only_cycle" "BillingCycle";

-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_offer_user_id_key" ON "discount_codes"("offer_user_id");

-- Server only: RLS on, no policies.
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
