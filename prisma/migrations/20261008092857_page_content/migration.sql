-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('tiktok', 'instagram', 'x', 'youtube', 'snapchat', 'threads', 'telegram', 'facebook', 'linkedin');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('none', 'in_review', 'verified', 'rejected');

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "contact_email" VARCHAR(254),
ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "whatsapp" VARCHAR(20);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "lang" "Lang" NOT NULL,
    "label" VARCHAR(18) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(60),
    "number" VARCHAR(60) NOT NULL,
    "file_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" VARCHAR(60) NOT NULL,
    "url" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "followers_updated_at" TIMESTAMPTZ,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'none',
    "verified_until" TIMESTAMPTZ,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_data" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "gender" JSONB,
    "ages" JSONB,
    "countries" JSONB,
    "cities" JSONB,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "audience_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_views" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "views" BIGINT NOT NULL,

    CONSTRAINT "monthly_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_logos" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "logo_url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brand_logos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "platform" "Platform",
    "video_url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_item_translations" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "lang" "Lang" NOT NULL,
    "brand" VARCHAR(60) NOT NULL DEFAULT '',
    "type" VARCHAR(60) NOT NULL DEFAULT '',

    CONSTRAINT "portfolio_item_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_settings" (
    "page_id" UUID NOT NULL,
    "show_on_page" BOOLEAN NOT NULL DEFAULT true,
    "show_in_pdf" BOOLEAN NOT NULL DEFAULT true,
    "currency" "Currency" NOT NULL DEFAULT 'SAR',
    "vat_included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rate_settings_pkey" PRIMARY KEY ("page_id")
);

-- CreateTable
CREATE TABLE "rates" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "name_en" VARCHAR(40),
    "price" DECIMAL(12,2) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_bundles" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "name" VARCHAR(40),
    "name_en" VARCHAR(40),
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_platforms" (
    "bundle_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,

    CONSTRAINT "bundle_platforms_pkey" PRIMARY KEY ("bundle_id","account_id")
);

-- CreateTable
CREATE TABLE "bundle_rates" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "name_en" VARCHAR(40),
    "price" DECIMAL(12,2) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bundle_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tags_page_id_lang_sort_idx" ON "tags"("page_id", "lang", "sort");

-- CreateIndex
CREATE INDEX "licenses_page_id_sort_idx" ON "licenses"("page_id", "sort");

-- CreateIndex
CREATE INDEX "social_accounts_page_id_sort_idx" ON "social_accounts"("page_id", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "audience_data_account_id_key" ON "audience_data"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_views_page_id_month_key" ON "monthly_views"("page_id", "month");

-- CreateIndex
CREATE INDEX "brand_logos_page_id_sort_idx" ON "brand_logos"("page_id", "sort");

-- CreateIndex
CREATE INDEX "portfolio_items_page_id_sort_idx" ON "portfolio_items"("page_id", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_item_translations_item_id_lang_key" ON "portfolio_item_translations"("item_id", "lang");

-- CreateIndex
CREATE INDEX "rates_account_id_sort_idx" ON "rates"("account_id", "sort");

-- CreateIndex
CREATE INDEX "rate_bundles_page_id_sort_idx" ON "rate_bundles"("page_id", "sort");

-- CreateIndex
CREATE INDEX "bundle_rates_bundle_id_sort_idx" ON "bundle_rates"("bundle_id", "sort");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_data" ADD CONSTRAINT "audience_data_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_views" ADD CONSTRAINT "monthly_views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_logos" ADD CONSTRAINT "brand_logos_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_item_translations" ADD CONSTRAINT "portfolio_item_translations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_settings" ADD CONSTRAINT "rate_settings_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_bundles" ADD CONSTRAINT "rate_bundles_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_platforms" ADD CONSTRAINT "bundle_platforms_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "rate_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_platforms" ADD CONSTRAINT "bundle_platforms_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_rates" ADD CONSTRAINT "bundle_rates_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "rate_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sanity checks.
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_followers_nonneg" CHECK ("followers" >= 0);
ALTER TABLE "monthly_views" ADD CONSTRAINT "monthly_views_nonneg" CHECK ("views" >= 0);
ALTER TABLE "rates" ADD CONSTRAINT "rates_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "bundle_rates" ADD CONSTRAINT "bundle_rates_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "pages" ADD CONSTRAINT "pages_whatsapp_digits" CHECK ("whatsapp" IS NULL OR "whatsapp" ~ '^[0-9]{8,15}$');

-- Row Level Security (see the rls migration for the approach). Ownership is
-- resolved through the page, so helpers keep the policies short.
CREATE OR REPLACE FUNCTION public.owns_page(p_page_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM pages WHERE id = p_page_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.owns_account(p_account_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM social_accounts a JOIN pages p ON p.id = a.page_id
                 WHERE a.id = p_account_id AND p.user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.owns_bundle(p_bundle_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM rate_bundles b JOIN pages p ON p.id = b.page_id
                 WHERE b.id = p_bundle_id AND p.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.owns_page(uuid), public.owns_account(uuid), public.owns_bundle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_page(uuid), public.owns_account(uuid), public.owns_bundle(uuid) TO authenticated;

ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audience_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "monthly_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_logos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_item_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_bundles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bundle_platforms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bundle_rates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_all_own" ON "tags" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "licenses_all_own" ON "licenses" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "social_accounts_all_own" ON "social_accounts" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "monthly_views_all_own" ON "monthly_views" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "brand_logos_all_own" ON "brand_logos" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "portfolio_items_all_own" ON "portfolio_items" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "rate_settings_all_own" ON "rate_settings" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "rate_bundles_all_own" ON "rate_bundles" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));

CREATE POLICY "portfolio_item_translations_all_own" ON "portfolio_item_translations" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portfolio_items i WHERE i.id = "item_id" AND owns_page(i.page_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_items i WHERE i.id = "item_id" AND owns_page(i.page_id)));

CREATE POLICY "audience_data_all_own" ON "audience_data" FOR ALL TO authenticated
  USING (owns_account("account_id")) WITH CHECK (owns_account("account_id"));
CREATE POLICY "rates_all_own" ON "rates" FOR ALL TO authenticated
  USING (owns_account("account_id")) WITH CHECK (owns_account("account_id"));

CREATE POLICY "bundle_platforms_all_own" ON "bundle_platforms" FOR ALL TO authenticated
  USING (owns_bundle("bundle_id") AND owns_account("account_id"))
  WITH CHECK (owns_bundle("bundle_id") AND owns_account("account_id"));
CREATE POLICY "bundle_rates_all_own" ON "bundle_rates" FOR ALL TO authenticated
  USING (owns_bundle("bundle_id")) WITH CHECK (owns_bundle("bundle_id"));

-- Writes go only through the server (Prisma, as table owner), which checks
-- ownership, verification rules and plan limits. Through Supabase's public
-- Data API a signed-in creator can READ their own rows and change nothing;
-- otherwise they could, e.g., mark an account verified or enable a Pro-only
-- setting without paying. The policies above keep reads owner-only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
