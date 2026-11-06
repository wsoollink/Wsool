
-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "lang" "Lang" NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "summary" VARCHAR(300) NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "cover_url" VARCHAR(500),
    "category" VARCHAR(30) NOT NULL,
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "articles_lang_published_at_idx" ON "articles"("lang", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "articles_lang_slug_key" ON "articles"("lang", "slug");


-- Server only (staff write through the admin panel; the public reads through server queries).
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
