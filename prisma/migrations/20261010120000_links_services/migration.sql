-- "My links" and "My services" sections of the creator page.
-- CreateTable
CREATE TABLE "page_links" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "title_en" VARCHAR(60),
    "url" VARCHAR(500) NOT NULL,
    "image_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(60),
    "description" VARCHAR(300) NOT NULL DEFAULT '',
    "description_en" VARCHAR(300),
    "price" DECIMAL(12,2),
    "unit" VARCHAR(30) NOT NULL DEFAULT '',
    "unit_en" VARCHAR(30),
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_links_page_id_sort_idx" ON "page_links"("page_id", "sort");

-- CreateIndex
CREATE INDEX "services_page_id_sort_idx" ON "services"("page_id", "sort");

-- AddForeignKey
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Creators read their own rows; writes go through the server only (Data API is read-only).
ALTER TABLE "page_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_links_all_own" ON "page_links" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
CREATE POLICY "services_all_own" ON "services" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
REVOKE INSERT, UPDATE, DELETE ON "page_links", "services" FROM anon, authenticated;
REVOKE ALL ON "page_links", "services" FROM anon;
