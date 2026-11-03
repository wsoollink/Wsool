-- CreateEnum
CREATE TYPE "AgencyRequestStatus" AS ENUM ('new', 'opened', 'declined');

-- CreateTable
CREATE TABLE "agency_requests" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "agency_name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "note" VARCHAR(1000),
    "lang" "Lang" NOT NULL DEFAULT 'ar',
    "status" "AgencyRequestStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ,

    CONSTRAINT "agency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_requests_status_created_at_idx" ON "agency_requests"("status", "created_at");

-- Server only: RLS on, no policies.
ALTER TABLE "agency_requests" ENABLE ROW LEVEL SECURITY;
