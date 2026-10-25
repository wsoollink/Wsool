-- When the creator last tapped "Connect" on a platform that links through a bot (Telegram): the bot only links a
-- channel to an account that asked for it in the last 30 minutes.
ALTER TABLE "social_accounts" ADD COLUMN "connect_requested_at" TIMESTAMPTZ;
