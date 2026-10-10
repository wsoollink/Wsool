-- One-time discount codes (admin) and the discount on an invoice.
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_code_id" UUID;

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "percent" INTEGER NOT NULL,
    "email" VARCHAR(254),
    "note" VARCHAR(120) NOT NULL DEFAULT '',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "used_at" TIMESTAMPTZ,
    "used_by" UUID,
    "invoice_id" UUID,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_invoice_id_key" ON "discount_codes"("invoice_id");

-- CreateIndex
CREATE INDEX "discount_codes_created_at_idx" ON "discount_codes"("created_at");


-- Codes stay readable for no one but the server (checked on checkout).
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_percent_range" CHECK ("percent" BETWEEN 1 AND 100);
ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "discount_codes" FROM anon, authenticated;
