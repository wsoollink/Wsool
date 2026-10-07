-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "Template" AS ENUM ('white', 'black', 'sand', 'pink', 'black_gold', 'vivid', 'green', 'custom');

-- CreateEnum
CREATE TYPE "NumberFont" AS ENUM ('wide', 'text');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SAR', 'USD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "username_changed_at" TIMESTAMPTZ,
    "primary_lang" "Lang" NOT NULL DEFAULT 'ar',
    "en_enabled" BOOLEAN NOT NULL DEFAULT false,
    "template" "Template" NOT NULL DEFAULT 'white',
    "custom_colors" JSONB,
    "accent" VARCHAR(7),
    "number_font" "NumberFont" NOT NULL DEFAULT 'wide',
    "hide_branding" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "lang" "Lang" NOT NULL,
    "full_name" VARCHAR(80) NOT NULL DEFAULT '',
    "specialty" VARCHAR(80) NOT NULL DEFAULT '',
    "bio" VARCHAR(500) NOT NULL DEFAULT '',
    "city" VARCHAR(60) NOT NULL DEFAULT '',
    "country" VARCHAR(60) NOT NULL DEFAULT '',

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserved_usernames" (
    "name" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserved_usernames_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'pro',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "cycle" "BillingCycle",
    "currency" "Currency",
    "trial_ends_at" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "provider" TEXT,
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pages_user_id_key" ON "pages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_username_key" ON "pages"("username");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_page_id_lang_key" ON "page_translations"("page_id", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Usernames: lowercase a-z, 0-9, dot, underscore, 3-20 chars (CLAUDE.md section 10).
-- Stored lowercase so the unique index is case-insensitive (section 12).
ALTER TABLE "pages" ADD CONSTRAINT "pages_username_format"
  CHECK ("username" ~ '^[a-z0-9._]{3,20}$');
ALTER TABLE "reserved_usernames" ADD CONSTRAINT "reserved_usernames_lowercase"
  CHECK ("name" = lower("name"));
