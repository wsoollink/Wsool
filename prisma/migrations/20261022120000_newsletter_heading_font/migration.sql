-- Newsletter: font of the title and headings (Wsool's font or the system font).
CREATE TYPE "email_font" AS ENUM ('wsool', 'system');
ALTER TABLE "newsletter_campaigns" ADD COLUMN "heading_font" "email_font" NOT NULL DEFAULT 'wsool';
