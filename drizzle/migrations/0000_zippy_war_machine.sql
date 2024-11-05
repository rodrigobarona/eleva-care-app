-- Skip the enum handling since it already exists and is in use
-- DO NOT drop and recreate the enum as it's being used

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"durationInMinutes" integer NOT NULL,
	"clerkUserId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"clerkUserId" text NOT NULL,
	"guestEmail" text NOT NULL,
	"guestName" text NOT NULL,
	"guestNotes" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"timezone" text NOT NULL,
	"durationInMinutes" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scheduleAvailabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduleId" uuid NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"dayOfWeek" "day" NOT NULL
);

CREATE TABLE IF NOT EXISTS "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" text NOT NULL,
	"clerkUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_clerkUserId_unique" UNIQUE("clerkUserId")
);

DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scheduleAvailabilities" ADD CONSTRAINT "scheduleAvailabilities_scheduleId_schedules_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "events_clerk_user_id_idx" ON "events" USING btree ("clerkUserId");
CREATE INDEX IF NOT EXISTS "meetings_clerkUserId_idx" ON "meetings" USING btree ("clerkUserId");
CREATE INDEX IF NOT EXISTS "meetings_eventId_idx" ON "meetings" USING btree ("eventId");
CREATE INDEX IF NOT EXISTS "scheduleIdIndex" ON "scheduleAvailabilities" USING btree ("scheduleId");

-- Modify the order of operations:
-- 1. First add the column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "slug" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Then update the values
UPDATE "events" 
SET "slug" = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

-- 3. Finally make it NOT NULL
ALTER TABLE "events" 
ALTER COLUMN "slug" SET NOT NULL;