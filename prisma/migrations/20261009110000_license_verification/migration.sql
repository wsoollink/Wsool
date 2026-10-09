-- Staff verify license files too (owner decision, Oct 2026).
ALTER TABLE "licenses" ADD COLUMN "verification_status" "VerificationStatus" NOT NULL DEFAULT 'none',
ADD COLUMN "reject_reason" VARCHAR(40),
ADD COLUMN "submitted_at" TIMESTAMPTZ,
ADD COLUMN "reviewed_at" TIMESTAMPTZ,
ADD COLUMN "reviewed_by" UUID;

CREATE INDEX "licenses_verification_status_idx" ON "licenses"("verification_status");
