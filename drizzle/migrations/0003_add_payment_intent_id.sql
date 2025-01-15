-- Add paymentIntentId column to meetings table
ALTER TABLE meetings ADD COLUMN "paymentIntentId" text;

-- Create index on paymentIntentId
CREATE INDEX "meetings_paymentIntentId_idx" ON meetings ("paymentIntentId"); 