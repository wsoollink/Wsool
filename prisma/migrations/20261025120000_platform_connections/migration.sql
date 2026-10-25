-- Platform connections (OAuth): followers and audience update by themselves, linked accounts count as verified.
CREATE TYPE "connection_status" AS ENUM ('active', 'error');

CREATE TABLE "platform_connections" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_id" VARCHAR(100) NOT NULL,
    "external_name" VARCHAR(200),
    "refresh_token" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '',
    "status" "connection_status" NOT NULL DEFAULT 'active',
    "last_sync_at" TIMESTAMPTZ,
    "last_error" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_connections_account_id_key" ON "platform_connections"("account_id");
CREATE UNIQUE INDEX "platform_connections_platform_external_id_key" ON "platform_connections"("platform", "external_id");
CREATE INDEX "platform_connections_status_last_sync_at_idx" ON "platform_connections"("status", "last_sync_at");

ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server only (tokens): RLS on, no policies, no Data API access.
ALTER TABLE "platform_connections" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "platform_connections" FROM anon, authenticated;
