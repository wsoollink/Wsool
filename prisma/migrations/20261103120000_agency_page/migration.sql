-- CreateEnum
CREATE TYPE "AgencyTemplate" AS ENUM ('executive', 'midnight', 'graphite', 'ivory');

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "accent" VARCHAR(7),
ADD COLUMN     "bio" VARCHAR(800),
ADD COLUMN     "bio_en" VARCHAR(800),
ADD COLUMN     "city" VARCHAR(60),
ADD COLUMN     "city_en" VARCHAR(60),
ADD COLUMN     "email" VARCHAR(254),
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "name_en" VARCHAR(80),
ADD COLUMN     "page_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" VARCHAR(20),
ADD COLUMN     "tagline" VARCHAR(100),
ADD COLUMN     "tagline_en" VARCHAR(100),
ADD COLUMN     "template" "AgencyTemplate" NOT NULL DEFAULT 'executive',
ADD COLUMN     "website" VARCHAR(200),
ADD COLUMN     "whatsapp" VARCHAR(15);

-- AlterTable
ALTER TABLE "agency_links" ADD COLUMN     "agency_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_on_page" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sort" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "agencies_slug_key" ON "agencies"("slug");


-- Same rules as pages.username / pages.whatsapp (checked in code too).
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_slug_format" CHECK ("slug" IS NULL OR "slug" ~ '^[a-z0-9._]{3,20}$');
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_whatsapp_format" CHECK ("whatsapp" IS NULL OR "whatsapp" ~ '^[0-9]{8,15}$');
