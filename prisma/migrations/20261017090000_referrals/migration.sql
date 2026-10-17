-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('credit', 'bank');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "credit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referred_at" TIMESTAMPTZ,
ADD COLUMN     "referred_by" UUID;

-- CreateTable
CREATE TABLE "referral_accounts" (
    "user_id" UUID NOT NULL,
    "payout_method" "PayoutMethod" NOT NULL DEFAULT 'credit',
    "iban" VARCHAR(34),
    "holder_name" VARCHAR(100),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "referral_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "referral_clicks" (
    "id" BIGSERIAL NOT NULL,
    "referrer_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "visitor_hash" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_commissions" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_user_id" UUID,
    "invoice_id" UUID,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "percent" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "available_at" TIMESTAMPTZ NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_payouts" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" VARCHAR(200) NOT NULL DEFAULT '',
    "invoice_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_clicks_referrer_id_day_visitor_hash_key" ON "referral_clicks"("referrer_id", "day", "visitor_hash");

-- CreateIndex
CREATE UNIQUE INDEX "referral_commissions_invoice_id_key" ON "referral_commissions"("invoice_id");

-- CreateIndex
CREATE INDEX "referral_commissions_referrer_id_created_at_idx" ON "referral_commissions"("referrer_id", "created_at");

-- CreateIndex
CREATE INDEX "referral_payouts_referrer_id_created_at_idx" ON "referral_payouts"("referrer_id", "created_at");

-- CreateIndex
CREATE INDEX "users_referred_by_idx" ON "users"("referred_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_accounts" ADD CONSTRAINT "referral_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Affiliate tables are server only (IBANs, money): RLS on, no policies, no Data API grants.
ALTER TABLE "referral_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_clicks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_payouts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "referral_accounts", "referral_clicks", "referral_commissions", "referral_payouts" FROM anon, authenticated;
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_amount_positive" CHECK ("amount" > 0 AND "percent" BETWEEN 1 AND 100);
ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_not_self_referred" CHECK ("referred_by" IS NULL OR "referred_by" <> "id");
