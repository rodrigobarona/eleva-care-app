-- Migration: Add stripeSessionId to meetings table
DO $$ 
BEGIN
    -- Check if the column doesn't exist before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'stripeSessionId'
    ) THEN
        -- Add the column
        ALTER TABLE "meetings" ADD COLUMN "stripeSessionId" text;
        -- Add unique constraint
        ALTER TABLE "meetings" ADD CONSTRAINT "meetings_stripeSessionId_unique" UNIQUE ("stripeSessionId");
    END IF;

    -- Check if the index doesn't exist before creating it
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'meetings'
        AND indexname = 'meetings_sessionId_idx'
    ) THEN
        -- Create the index
        CREATE INDEX "meetings_sessionId_idx" ON "meetings" ("stripeSessionId");
    END IF;
END $$; 