-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('checkout', 'renewal');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "next_retry_at" TIMESTAMPTZ,
ADD COLUMN     "payment_method_label" VARCHAR(60),
ADD COLUMN     "payment_token" TEXT;

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" INTEGER,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "cycle" "BillingCycle" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "vat_amount" DECIMAL(10,2) NOT NULL,
    "period_start" TIMESTAMPTZ,
    "period_end" TIMESTAMPTZ,
    "provider" VARCHAR(20) NOT NULL,
    "provider_payment_id" TEXT,
    "failure_reason" VARCHAR(200),
    "paid_at" TIMESTAMPTZ,
    "refunded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_payment_id_key" ON "invoices"("provider_payment_id");

-- CreateIndex
CREATE INDEX "invoices_user_id_created_at_idx" ON "invoices"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_status_paid_at_idx" ON "invoices"("status", "paid_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice numbers are taken from this sequence when a payment succeeds.
CREATE SEQUENCE "invoice_number_seq" START 1001;

-- Row Level Security: creators may read their own invoices; nothing else
-- through the Data API (writes are revoked for anon/authenticated).
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select_own" ON "invoices" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "invoices" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "invoice_number_seq" FROM anon, authenticated;

-- The saved payment token is for the server only: column-level SELECT for
-- everything else (a column REVOKE alone has no effect under a table grant).
REVOKE SELECT ON "subscriptions" FROM anon, authenticated;
GRANT SELECT ("id", "user_id", "plan", "status", "cycle", "currency", "trial_ends_at", "current_period_end",
  "cancel_at_period_end", "payment_method_label", "created_at", "updated_at") ON "subscriptions" TO authenticated;
