-- CreateEnum
CREATE TYPE "DiscountAudience" AS ENUM ('creators', 'agencies');

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "audience" "DiscountAudience" NOT NULL DEFAULT 'creators',
ADD COLUMN     "free_plan" "AgencyPlan";

