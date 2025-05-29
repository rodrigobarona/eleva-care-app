ALTER TABLE "slotReservations" RENAME TO "slot_reservations";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "eventId" TO "event_id";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "clerkUserId" TO "clerk_user_id";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "guestEmail" TO "guest_email";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "startTime" TO "start_time";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "endTime" TO "end_time";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "expiresAt" TO "expires_at";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "stripePaymentIntentId" TO "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "stripeSessionId" TO "stripe_session_id";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "slot_reservations" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "slot_reservations" DROP CONSTRAINT "slotReservations_stripePaymentIntentId_unique";--> statement-breakpoint
ALTER TABLE "slot_reservations" DROP CONSTRAINT "slotReservations_stripeSessionId_unique";--> statement-breakpoint
ALTER TABLE "slot_reservations" DROP CONSTRAINT "slotReservations_eventId_events_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "slotReservations_clerkUserId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "slotReservations_eventId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "slotReservations_expiresAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "slotReservations_paymentIntentId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "slotReservations_sessionId_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_reservations_clerk_user_id_idx" ON "slot_reservations" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_reservations_event_id_idx" ON "slot_reservations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_reservations_expires_at_idx" ON "slot_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_reservations_payment_intent_id_idx" ON "slot_reservations" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_reservations_session_id_idx" ON "slot_reservations" USING btree ("stripe_session_id");--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id");--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_stripe_session_id_unique" UNIQUE("stripe_session_id");