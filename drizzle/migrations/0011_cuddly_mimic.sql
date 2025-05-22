CREATE TABLE IF NOT EXISTS "scheduling_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"before_event_buffer" integer DEFAULT 0 NOT NULL,
	"after_event_buffer" integer DEFAULT 0 NOT NULL,
	"minimum_notice" integer DEFAULT 0 NOT NULL,
	"time_slot_interval" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
