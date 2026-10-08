-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'verifier', 'support', 'finance', 'custom');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "screenshot_path" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" VARCHAR(60) NOT NULL,
    "followers" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reason" VARCHAR(40),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_members" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "role" "AdminRole" NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_email" TEXT NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "target_type" VARCHAR(30),
    "target_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_requests_status_created_at_idx" ON "verification_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_requests_account_id_created_at_idx" ON "verification_requests"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_members_email_key" ON "admin_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_members_user_id_key" ON "admin_members"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One open request per account at a time.
CREATE UNIQUE INDEX "verification_requests_one_pending" ON "verification_requests"("account_id") WHERE "status" = 'pending';

-- Staff emails are stored lowercased.
ALTER TABLE "admin_members" ADD CONSTRAINT "admin_members_email_lower" CHECK ("email" = lower("email"));

-- Row Level Security (CLAUDE.md section 2). Creators may read their own
-- verification requests; staff tables are never exposed through the Data API
-- (no policies = no access for anon/authenticated). All writes go through the
-- server, which checks the signed-in user and permissions.
ALTER TABLE "verification_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_requests_select_own" ON "verification_requests" FOR SELECT TO authenticated
  USING (owns_account("account_id"));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "verification_requests", "admin_members", "audit_log" FROM anon, authenticated;

-- Private "verification" bucket for account screenshots: staff view them
-- through short-lived signed URLs only. Guarded for local Postgres.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('verification', 'verification', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
