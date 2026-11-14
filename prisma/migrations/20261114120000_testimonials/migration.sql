-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL,
    "audience" "DiscountAudience" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "name_en" VARCHAR(80),
    "role" VARCHAR(80),
    "role_en" VARCHAR(80),
    "quote" VARCHAR(400) NOT NULL,
    "quote_en" VARCHAR(400),
    "photo_url" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonials_audience_sort_idx" ON "testimonials"("audience", "sort");


-- Server only: RLS on, no policies.
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
