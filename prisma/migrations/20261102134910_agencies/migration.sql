-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AgencyRole" AS ENUM ('owner', 'manager', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('pending', 'active', 'declined', 'cancelled', 'ended');

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "status" "AgencyStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_members" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "user_id" UUID,
    "role" "AgencyRole" NOT NULL DEFAULT 'editor',
    "invited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMPTZ,

    CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_links" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'pending',
    "can_content" BOOLEAN NOT NULL DEFAULT true,
    "can_rates" BOOLEAN NOT NULL DEFAULT true,
    "can_contact" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" UUID NOT NULL,
    "invited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "ended_by" VARCHAR(10),

    CONSTRAINT "agency_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_activity" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "section" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_members_email_idx" ON "agency_members"("email");

-- CreateIndex
CREATE INDEX "agency_members_user_id_idx" ON "agency_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agency_members_agency_id_email_key" ON "agency_members"("agency_id", "email");

-- CreateIndex
CREATE INDEX "agency_links_page_id_status_idx" ON "agency_links"("page_id", "status");

-- CreateIndex
CREATE INDEX "agency_links_agency_id_status_idx" ON "agency_links"("agency_id", "status");

-- CreateIndex
CREATE INDEX "agency_activity_page_id_created_at_idx" ON "agency_activity"("page_id", "created_at");

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_links" ADD CONSTRAINT "agency_links_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_links" ADD CONSTRAINT "agency_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_activity" ADD CONSTRAINT "agency_activity_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One active agency per page, and one open invite per agency + page.
CREATE UNIQUE INDEX "agency_links_one_active_per_page" ON "agency_links"("page_id") WHERE "status" = 'active';
CREATE UNIQUE INDEX "agency_links_one_open_invite" ON "agency_links"("agency_id", "page_id") WHERE "status" IN ('pending', 'active');

-- Server only: RLS on, no policies (CLAUDE.md, database workflow).
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_activity" ENABLE ROW LEVEL SECURITY;
