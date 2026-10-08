-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('hosting', 'software', 'marketing', 'salaries', 'payment_fees', 'legal', 'other');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('none', 'monthly', 'yearly');

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "end_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "recurrence" "Recurrence" NOT NULL DEFAULT 'none',
    "description" VARCHAR(200) NOT NULL DEFAULT '',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_links" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "sections" JSONB NOT NULL,
    "months" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "password_hash" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "last_viewed_at" TIMESTAMPTZ,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "investor_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "investor_links_token_hash_key" ON "investor_links"("token_hash");

-- Staff-only tables: RLS on, no policies (server only).
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investor_links" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "expenses", "investor_links" FROM anon, authenticated;
