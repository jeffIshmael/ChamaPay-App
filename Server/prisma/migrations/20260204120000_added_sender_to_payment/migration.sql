-- Add sender to Payment
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "sender" TEXT;
