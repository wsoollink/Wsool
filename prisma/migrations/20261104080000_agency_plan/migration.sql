-- CreateEnum
CREATE TYPE "AgencyPlan" AS ENUM ('trial', 'starter', 'growth', 'custom');

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "plan" "AgencyPlan" NOT NULL DEFAULT 'trial',
ADD COLUMN     "plan_cycle" "BillingCycle",
ADD COLUMN     "plan_until" TIMESTAMPTZ;

