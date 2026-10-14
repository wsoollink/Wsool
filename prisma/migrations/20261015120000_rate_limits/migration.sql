-- CreateTable
CREATE TABLE "rate_limits" (
    "key" VARCHAR(200) NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- Server only: RLS on, no policies, no grants for the Data API roles.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "rate_limits" FROM anon, authenticated;
