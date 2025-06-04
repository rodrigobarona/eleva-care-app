ALTER TABLE "slot_reservations" ADD COLUMN "gentle_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD COLUMN "urgent_reminder_sent_at" timestamp;