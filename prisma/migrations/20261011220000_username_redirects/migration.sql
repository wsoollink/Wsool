-- CreateTable
CREATE TABLE "username_redirects" (
    "name" TEXT NOT NULL,
    "page_id" UUID NOT NULL,
    "released_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "username_redirects_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "username_redirects_page_id_idx" ON "username_redirects"("page_id");

-- AddForeignKey
ALTER TABLE "username_redirects" ADD CONSTRAINT "username_redirects_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Server only: RLS on, no policies, no Data API access.
ALTER TABLE "username_redirects" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "username_redirects" FROM anon, authenticated;
