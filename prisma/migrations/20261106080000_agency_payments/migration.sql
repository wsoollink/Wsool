-- Agency plans paid online (owner, Nov 2026): invoices can belong to an agency; saved card + auto-renew on agencies.
-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "payment_method_label" VARCHAR(60),
ADD COLUMN     "payment_token" TEXT,
ADD COLUMN     "plan_auto_renew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan_currency" "Currency",
ADD COLUMN     "plan_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plan_retry_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "agency_id" UUID,
ADD COLUMN     "agency_plan" "AgencyPlan",
ALTER COLUMN "subscription_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "invoices_agency_id_created_at_idx" ON "invoices"("agency_id", "created_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- An invoice is a creator's (subscription) or an agency's, never both.
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_one_owner" CHECK (NOT (subscription_id IS NOT NULL AND agency_id IS NOT NULL));
