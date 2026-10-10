-- CreateEnum
CREATE TYPE "PhotoShape" AS ENUM ('full', 'circle');

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "number_font",
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "photo_shape" "PhotoShape" NOT NULL DEFAULT 'full';

-- DropEnum
DROP TYPE "NumberFont";

