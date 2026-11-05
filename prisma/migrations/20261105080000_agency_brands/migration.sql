-- CreateTable
CREATE TABLE "agency_brands" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "logo_url" TEXT NOT NULL,
    "name" VARCHAR(60),
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agency_brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_brands_agency_id_sort_idx" ON "agency_brands"("agency_id", "sort");

-- AddForeignKey
ALTER TABLE "agency_brands" ADD CONSTRAINT "agency_brands_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Server only: RLS on, no policies.
ALTER TABLE "agency_brands" ENABLE ROW LEVEL SECURITY;
