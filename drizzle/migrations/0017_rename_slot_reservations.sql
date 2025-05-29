-- Create new table with snake_case naming
CREATE TABLE IF NOT EXISTS "slot_reservations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "clerk_user_id" text NOT NULL,
    "guest_email" text NOT NULL,
    "start_time" timestamp NOT NULL,
    "end_time" timestamp NOT NULL,
    "expires_at" timestamp NOT NULL,
    "stripe_payment_intent_id" text,
    "stripe_session_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "slot_reservations_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
    CONSTRAINT "slot_reservations_stripe_session_id_unique" UNIQUE("stripe_session_id")
);

-- Copy data from old table to new table
INSERT INTO "slot_reservations" (
    "id",
    "event_id",
    "clerk_user_id",
    "guest_email",
    "start_time",
    "end_time",
    "expires_at",
    "stripe_payment_intent_id",
    "stripe_session_id",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "eventId",
    "clerkUserId",
    "guestEmail",
    "startTime",
    "endTime",
    "expiresAt",
    "stripePaymentIntentId",
    "stripeSessionId",
    "createdAt",
    "updatedAt"
FROM "slotReservations";

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_event_id_events_id_fk" 
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "slot_reservations_clerk_user_id_idx" ON "slot_reservations" USING btree ("clerk_user_id");
CREATE INDEX IF NOT EXISTS "slot_reservations_event_id_idx" ON "slot_reservations" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "slot_reservations_expires_at_idx" ON "slot_reservations" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "slot_reservations_payment_intent_id_idx" ON "slot_reservations" USING btree ("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "slot_reservations_session_id_idx" ON "slot_reservations" USING btree ("stripe_session_id");

-- Drop old indexes
DROP INDEX IF EXISTS "slotReservations_clerkUserId_idx";
DROP INDEX IF EXISTS "slotReservations_eventId_idx";
DROP INDEX IF EXISTS "slotReservations_expiresAt_idx";
DROP INDEX IF EXISTS "slotReservations_paymentIntentId_idx";
DROP INDEX IF EXISTS "slotReservations_sessionId_idx";

-- Drop old table (this will automatically drop its constraints)
DROP TABLE IF EXISTS "slotReservations"; 