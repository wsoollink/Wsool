-- Ad rates can be shown in AED and KWD too (owner decision, Oct 2026).
CREATE TYPE "RateCurrency" AS ENUM ('SAR', 'USD', 'AED', 'KWD');

ALTER TABLE "rate_settings" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "rate_settings" ALTER COLUMN "currency" TYPE "RateCurrency" USING ("currency"::text::"RateCurrency");
ALTER TABLE "rate_settings" ALTER COLUMN "currency" SET DEFAULT 'SAR';
