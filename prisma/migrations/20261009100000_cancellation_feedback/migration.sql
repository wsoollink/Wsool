-- "Why are you cancelling?" answers (owner decision, Oct 2026).
CREATE TABLE "cancellation_feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cancellation_feedback_created_at_idx" ON "cancellation_feedback"("created_at");

ALTER TABLE "cancellation_feedback" ADD CONSTRAINT "cancellation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server only: RLS on, no policies, no Data API access.
ALTER TABLE "cancellation_feedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "cancellation_feedback" FROM anon, authenticated;
