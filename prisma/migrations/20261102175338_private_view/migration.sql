-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "in_directory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lock_whole" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "private_password" TEXT,
ADD COLUMN     "private_sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "private_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "private_links" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "token_sealed" TEXT,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "views" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "private_links_token_hash_key" ON "private_links"("token_hash");

-- CreateIndex
CREATE INDEX "private_links_page_id_idx" ON "private_links"("page_id");

-- AddForeignKey
ALTER TABLE "private_links" ADD CONSTRAINT "private_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server only: RLS on, no policies (tokens and visit counts are the creator's, read through the server).
ALTER TABLE "private_links" ENABLE ROW LEVEL SECURITY;
