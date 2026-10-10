-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name_ar" VARCHAR(40) NOT NULL,
    "name_en" VARCHAR(40) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_categories" (
    "page_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "page_categories_pkey" PRIMARY KEY ("page_id","category_id")
);

-- CreateIndex
CREATE INDEX "page_categories_category_id_idx" ON "page_categories"("category_id");

-- AddForeignKey
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Categories are read by the server only; creators read their own picks.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "categories" FROM anon, authenticated;
ALTER TABLE "page_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_categories_all_own" ON "page_categories" FOR ALL TO authenticated
  USING (owns_page("page_id")) WITH CHECK (owns_page("page_id"));
REVOKE INSERT, UPDATE, DELETE ON "page_categories" FROM anon, authenticated;
REVOKE ALL ON "page_categories" FROM anon;

-- Starting list (owner edits it in the admin panel).
INSERT INTO "categories" ("id", "name_ar", "name_en", "sort") VALUES
  (gen_random_uuid(), 'طبخ', 'Cooking', 1),
  (gen_random_uuid(), 'سفر', 'Travel', 2),
  (gen_random_uuid(), 'تقنية', 'Tech', 3),
  (gen_random_uuid(), 'موضة', 'Fashion', 4),
  (gen_random_uuid(), 'جمال', 'Beauty', 5),
  (gen_random_uuid(), 'رياضة ولياقة', 'Sports & fitness', 6),
  (gen_random_uuid(), 'ألعاب', 'Gaming', 7),
  (gen_random_uuid(), 'تعليم', 'Education', 8),
  (gen_random_uuid(), 'أعمال ومال', 'Business & finance', 9),
  (gen_random_uuid(), 'كوميديا', 'Comedy', 10),
  (gen_random_uuid(), 'عائلة', 'Family', 11),
  (gen_random_uuid(), 'سيارات', 'Cars', 12),
  (gen_random_uuid(), 'فن وتصميم', 'Art & design', 13),
  (gen_random_uuid(), 'نمط حياة', 'Lifestyle', 14);
