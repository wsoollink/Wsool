-- Public page sections the creator chose to hide (numbers, brands, works, rates). The data itself is kept.
ALTER TABLE "pages" ADD COLUMN "hidden_sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
