-- "Discount coupons" section of the creator page (owner, Oct 2026).
ALTER TYPE "ClickKind" ADD VALUE 'coupon_copy';
ALTER TYPE "ClickKind" ADD VALUE 'coupon_open';

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "store" VARCHAR(40) NOT NULL,
    "store_en" VARCHAR(40),
    "description" VARCHAR(120) NOT NULL DEFAULT '',
    "description_en" VARCHAR(120),
    "code" VARCHAR(30) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "logo_url" TEXT,
    "expires_on" DATE,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_page_id_sort_idx" ON "coupons"("page_id", "sort");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Creators read their own rows; writes go through the server only (Data API is read-only).
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_all_own" ON "coupons" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
REVOKE INSERT, UPDATE, DELETE ON "coupons" FROM anon, authenticated;
REVOKE ALL ON "coupons" FROM anon;
