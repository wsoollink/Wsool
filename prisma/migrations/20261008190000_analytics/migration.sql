-- CreateEnum
CREATE TYPE "ClickKind" AS ENUM ('whatsapp', 'email', 'social', 'work');

-- CreateTable
CREATE TABLE "page_views" (
    "id" BIGSERIAL NOT NULL,
    "page_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "visitor_hash" VARCHAR(32) NOT NULL,
    "country" VARCHAR(2),
    "referrer" VARCHAR(100),
    "device" VARCHAR(10) NOT NULL,
    "lang" "Lang" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_clicks" (
    "id" BIGSERIAL NOT NULL,
    "page_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "kind" "ClickKind" NOT NULL,
    "platform" "Platform",
    "visitor_hash" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_views_page_id_day_idx" ON "page_views"("page_id", "day");

-- CreateIndex
CREATE INDEX "page_views_page_id_visitor_hash_day_idx" ON "page_views"("page_id", "visitor_hash", "day");

-- CreateIndex
CREATE INDEX "contact_clicks_page_id_day_idx" ON "contact_clicks"("page_id", "day");

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_clicks" ADD CONSTRAINT "contact_clicks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: creators may read their own page's stats; visits are
-- written only by the server (/api/track).
ALTER TABLE "page_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_clicks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_views_select_own" ON "page_views" FOR SELECT TO authenticated USING (owns_page("page_id"));
CREATE POLICY "contact_clicks_select_own" ON "contact_clicks" FOR SELECT TO authenticated USING (owns_page("page_id"));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "page_views", "contact_clicks" FROM anon, authenticated;
