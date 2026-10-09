-- Contact channels can be hidden without deleting the value (dashboard design).
ALTER TABLE "pages" ADD COLUMN "whatsapp_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "email_visible" BOOLEAN NOT NULL DEFAULT true;
