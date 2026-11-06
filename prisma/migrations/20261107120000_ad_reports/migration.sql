
-- CreateTable
CREATE TABLE "ad_reports" (
    "id" UUID NOT NULL,
    "page_id" UUID,
    "agency_id" UUID,
    "brand" VARCHAR(80) NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'ar',
    "token_hash" VARCHAR(64) NOT NULL,
    "token_sealed" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "views" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ad_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_report_posts" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "external_id" VARCHAR(120),
    "title" VARCHAR(300),
    "thumb_url" VARCHAR(1000),
    "posted_at" TIMESTAMPTZ,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMPTZ,
    "sync_error" VARCHAR(30),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_report_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_report_snapshots" (
    "post_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "metrics" JSONB NOT NULL,

    CONSTRAINT "ad_report_snapshots_pkey" PRIMARY KEY ("post_id","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_reports_token_hash_key" ON "ad_reports"("token_hash");

-- CreateIndex
CREATE INDEX "ad_reports_page_id_idx" ON "ad_reports"("page_id");

-- CreateIndex
CREATE INDEX "ad_reports_agency_id_idx" ON "ad_reports"("agency_id");

-- CreateIndex
CREATE INDEX "ad_report_posts_report_id_idx" ON "ad_report_posts"("report_id");

-- CreateIndex
CREATE INDEX "ad_report_posts_last_sync_at_idx" ON "ad_report_posts"("last_sync_at");

-- AddForeignKey
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_report_posts" ADD CONSTRAINT "ad_report_posts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "ad_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_report_posts" ADD CONSTRAINT "ad_report_posts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_report_snapshots" ADD CONSTRAINT "ad_report_snapshots_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "ad_report_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A report belongs to a creator page or to an agency, never both or neither.
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_one_owner" CHECK ((page_id IS NULL) <> (agency_id IS NULL));

-- Server only (RLS on, no policies): reports are read through the server, the shared page by its token.
ALTER TABLE "ad_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ad_report_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ad_report_snapshots" ENABLE ROW LEVEL SECURITY;
