-- CreateTable
CREATE TABLE "agency_accounts" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" VARCHAR(100) NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agency_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_accounts_agency_id_sort_idx" ON "agency_accounts"("agency_id", "sort");

-- AddForeignKey
ALTER TABLE "agency_accounts" ADD CONSTRAINT "agency_accounts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Server only: RLS on, no policies.
ALTER TABLE "agency_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_accounts" ADD CONSTRAINT "agency_accounts_followers_nonneg" CHECK ("followers" >= 0);
