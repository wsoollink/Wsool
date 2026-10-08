-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "dedupe_key" VARCHAR(100),
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "user_id" UUID NOT NULL,
    "email_reminders" BOOLEAN NOT NULL DEFAULT true,
    "email_product_news" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: creators read their own notifications and settings;
-- all writes go through the server.
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON "notifications" FOR SELECT TO authenticated USING ("user_id" = auth.uid());
CREATE POLICY "notification_settings_select_own" ON "notification_settings" FOR SELECT TO authenticated USING ("user_id" = auth.uid());
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "notifications", "notification_settings" FROM anon, authenticated;
