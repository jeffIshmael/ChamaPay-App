-- This migration is to sync the migration history with the actual database state.
-- The lastReadTime column was added via db push and is already present in the DB.
ALTER TABLE "ChamaMember" ADD COLUMN IF NOT EXISTS "lastReadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
