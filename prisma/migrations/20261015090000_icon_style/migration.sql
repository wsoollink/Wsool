-- CreateEnum
CREATE TYPE "IconStyle" AS ENUM ('color', 'solid', 'outline');

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "icon_style" "IconStyle" NOT NULL DEFAULT 'solid';
