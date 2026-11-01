-- Free text block in "Links & services": a short title and up to 300 characters, in Arabic and (optionally) English.
ALTER TABLE "pages" ADD COLUMN "note_title" VARCHAR(40),
  ADD COLUMN "note_body" VARCHAR(300),
  ADD COLUMN "note_title_en" VARCHAR(40),
  ADD COLUMN "note_body_en" VARCHAR(300);
