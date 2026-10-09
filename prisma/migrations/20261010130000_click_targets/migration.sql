-- Taps on "My links" cards and "Request this service" buttons.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClickKind" ADD VALUE 'link';
ALTER TYPE "ClickKind" ADD VALUE 'service';

-- AlterTable
ALTER TABLE "contact_clicks" ADD COLUMN     "target_id" UUID;

