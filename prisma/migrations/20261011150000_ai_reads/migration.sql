-- CreateEnum
CREATE TYPE "AiReadKind" AS ENUM ('account', 'audience');

-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "ai_result" JSONB;

-- CreateTable
CREATE TABLE "ai_reads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiReadKind" NOT NULL,
    "path" TEXT,
    "account_id" UUID,
    "ok" BOOLEAN NOT NULL,
    "result" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reads_user_id_created_at_idx" ON "ai_reads"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_reads" ADD CONSTRAINT "ai_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Server only: no access through the Data API.
ALTER TABLE "ai_reads" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ai_reads" FROM anon, authenticated;
