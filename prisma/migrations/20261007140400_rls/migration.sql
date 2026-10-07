-- Row Level Security on every table (CLAUDE.md section 2).
--
-- The app talks to the database only through Prisma on the server, as the
-- table owner, which is not subject to RLS; ownership is enforced in server
-- code (section 12). These policies are the second line of defense: through
-- Supabase's public Data API a signed-in creator can only reach their own rows,
-- and anonymous visitors reach nothing.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reserved_usernames" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- users: read and update own row.
CREATE POLICY "users_select_own" ON "users" FOR SELECT TO authenticated
  USING ("id" = auth.uid());
CREATE POLICY "users_update_own" ON "users" FOR UPDATE TO authenticated
  USING ("id" = auth.uid()) WITH CHECK ("id" = auth.uid());

-- pages: full access to own page only.
CREATE POLICY "pages_all_own" ON "pages" FOR ALL TO authenticated
  USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());

-- page_translations: through the owning page.
CREATE POLICY "page_translations_all_own" ON "page_translations" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "pages" p WHERE p."id" = "page_id" AND p."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "pages" p WHERE p."id" = "page_id" AND p."user_id" = auth.uid()));

-- subscriptions: read own; only the server (billing) writes.
CREATE POLICY "subscriptions_select_own" ON "subscriptions" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

-- reserved_usernames and _prisma_migrations: no policies = no Data API access.
